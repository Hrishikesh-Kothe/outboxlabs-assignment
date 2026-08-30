import { formatScheduleBadge } from "../../lib/format";

export function StatusBadge({
  status,
  scheduledAt,
}: {
  status: string;
  scheduledAt: string;
}) {
  if (status === "sent") {
    return (
      <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs text-neutral-600">
        Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs text-orange-800">
      <span aria-hidden>◷</span>
      {status === "delayed" ? "Delayed " : ""}
      {formatScheduleBadge(scheduledAt)}
    </span>
  );
}
