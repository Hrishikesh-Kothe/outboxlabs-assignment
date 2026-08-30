import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEmail, type EmailDetail } from "../lib/api";
import { formatDetailTime } from "../lib/format";
import { isStarred, toggleStar } from "../lib/stars";

export function EmailDetailPage() {
  const { id } = useParams();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [error, setError] = useState("");
  const [star, setStar] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    setStar(isStarred(id));
    void getEmail(id)
      .then(setEmail)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return <p className="p-10 text-sm text-red-600">{error}</p>;
  }

  if (!email) {
    return <p className="p-10 text-sm text-neutral-400">Loading…</p>;
  }

  return (
    <article className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/inbox" className="text-xl text-neutral-500">
            ←
          </Link>
          <h1 className="text-xl font-semibold">{email.subject}</h1>
        </div>
        <button
          type="button"
          className={`text-xl ${star ? "text-amber-400" : "text-neutral-300"}`}
          onClick={() => {
            if (id) {
              setStar(toggleStar(id));
            }
          }}
        >
          {star ? "★" : "☆"}
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-full bg-[#22A45A] font-semibold text-white">
          {email.from.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {email.from}{" "}
            <span className="font-normal text-neutral-400">&lt;{email.from}&gt;</span>
          </p>
          <p className="text-xs text-neutral-500">to me</p>
        </div>
        <p className="text-sm text-neutral-500">
          {formatDetailTime(email.sentAt ?? email.scheduledAt)}
        </p>
      </div>

      <div
        className="prose mt-8 max-w-none text-neutral-800"
        dangerouslySetInnerHTML={{ __html: email.body }}
      />
    </article>
  );
}
