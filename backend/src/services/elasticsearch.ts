import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env.js";

const INDEX = "emails";

export const es = new Client({
  node: env.elasticsearchUrl,
});

export type EmailSearchDoc = {
  id: string;
  userId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
};

export async function ensureEmailIndex(): Promise<void> {
  const exists = await es.indices.exists({ index: INDEX });
  if (exists) {
    return;
  }

  await es.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        userId: { type: "keyword" },
        campaignId: { type: "keyword" },
        senderId: { type: "keyword" },
        recipient: { type: "text", fields: { raw: { type: "keyword" } } },
        subject: { type: "text" },
        body: { type: "text" },
        status: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
      },
    },
  });
}

export async function indexEmail(doc: EmailSearchDoc): Promise<void> {
  try {
    await es.index({
      index: INDEX,
      id: doc.id,
      document: doc,
      refresh: false,
    });
  } catch (error) {
    console.warn("Elasticsearch index skipped:", error);
  }
}

export async function searchEmailIds(input: {
  userId: string;
  q: string;
  statuses?: string[];
}): Promise<string[] | null> {
  try {
    const result = await es.search({
      index: INDEX,
      size: 100,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: input.q,
                fields: ["subject", "body", "recipient"],
              },
            },
          ],
          filter: [
            { term: { userId: input.userId } },
            ...(input.statuses?.length
              ? [{ terms: { status: input.statuses } }]
              : []),
          ],
        },
      },
    });

    return result.hits.hits
      .map((hit) => hit._id)
      .filter((id): id is string => Boolean(id));
  } catch (error) {
    console.warn("Elasticsearch search failed, falling back to MySQL:", error);
    return null;
  }
}
