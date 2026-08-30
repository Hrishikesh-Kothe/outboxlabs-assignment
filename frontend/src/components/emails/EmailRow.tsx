import { Link } from "react-router-dom";
import { displayName } from "../../lib/format";
import type { EmailListItem } from "../../lib/api";
import { StatusBadge } from "./StatusBadge";

export function EmailRow({
  email,
  starred,
  onToggleStar,
}: {
  email: EmailListItem;
  starred: boolean;
  onToggleStar: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-neutral-100 px-2 py-4">
      <Link to={`/inbox/${email.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-neutral-800">
            To: {displayName(email.recipient)}
          </span>
          <StatusBadge status={email.status} scheduledAt={email.scheduledAt} />
          <span className="min-w-0 truncate text-sm">
            <span className="font-semibold text-neutral-900">{email.subject}</span>
            <span className="text-neutral-400"> — {email.snippet}</span>
          </span>
        </div>
      </Link>
      <button
        type="button"
        aria-label="Star"
        onClick={onToggleStar}
        className={`text-lg ${starred ? "text-amber-400" : "text-neutral-300"}`}
      >
        {starred ? "★" : "☆"}
      </button>
    </div>
  );
}
