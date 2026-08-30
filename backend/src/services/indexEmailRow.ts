import type { EmailJob, Campaign } from "@prisma/client";
import { indexEmail } from "./elasticsearch.js";

export async function indexEmailRow(
  row: EmailJob & { campaign: Pick<Campaign, "userId" | "senderId" | "subject" | "body"> },
): Promise<void> {
  await indexEmail({
    id: row.id,
    userId: row.campaign.userId,
    campaignId: row.campaignId,
    senderId: row.campaign.senderId,
    recipient: row.recipient,
    subject: row.campaign.subject,
    body: row.campaign.body.replace(/<[^>]+>/g, " "),
    status: row.status,
    scheduledAt: row.scheduledAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  });
}
