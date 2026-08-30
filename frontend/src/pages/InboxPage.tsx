import { useCallback, useEffect, useState } from "react";
import { EmailRow } from "../components/emails/EmailRow";
import { listEmails, type EmailListItem } from "../lib/api";
import { isStarred, toggleStar } from "../lib/stars";

export function InboxPage({ folder }: { folder: "scheduled" | "sent" }) {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stars, setStars] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEmails(await listEmails(folder, q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load emails");
    } finally {
      setLoading(false);
    }
  }, [folder, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex h-screen flex-col px-8 py-6">
      <div className="flex items-center gap-3">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-neutral-100 px-4">
          <span className="text-neutral-400">⌕</span>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <button type="button" className="text-neutral-400" title="Filter">
          ⚙
        </button>
        <button type="button" className="text-neutral-400" title="Refresh" onClick={() => void load()}>
          ↻
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-16 text-center text-sm text-neutral-400">Loading emails…</p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-600">{error}</p>
        ) : emails.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-400">
            {q
              ? "No emails match that search."
              : folder === "scheduled"
                ? "No scheduled emails yet. Click Compose to add some."
                : "No sent emails yet."}
          </p>
        ) : (
          emails.map((email) => (
            <EmailRow
              key={`${email.id}-${stars}`}
              email={email}
              starred={isStarred(email.id)}
              onToggleStar={() => {
                toggleStar(email.id);
                setStars((value) => value + 1);
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}
