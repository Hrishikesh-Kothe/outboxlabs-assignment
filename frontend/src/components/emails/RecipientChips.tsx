type Props = {
  emails: string[];
  onAdd: (value: string) => void;
  onUpload: (file: File) => void;
};

export function RecipientChips({ emails, onAdd, onUpload }: Props) {
  const visible = emails.slice(0, 3);
  const extra = emails.length - visible.length;

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 py-3">
      <span className="w-14 shrink-0 text-sm text-neutral-500">To</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {visible.map((email) => (
          <span
            key={email}
            className="rounded-full border border-[#22A45A] px-2.5 py-0.5 text-xs text-[#22A45A]"
          >
            {email}
          </span>
        ))}
        {extra > 0 ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            +{extra}
          </span>
        ) : null}
        <input
          className="min-w-[160px] flex-1 bg-transparent text-sm outline-none"
          placeholder={emails.length ? "" : "recipient@example.com"}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              onAdd(event.currentTarget.value);
              event.currentTarget.value = "";
            }
          }}
          onBlur={(event) => {
            if (event.currentTarget.value.trim()) {
              onAdd(event.currentTarget.value);
              event.currentTarget.value = "";
            }
          }}
        />
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-1 text-sm text-neutral-600">
        <span aria-hidden>↑</span>
        Upload List
        <input
          type="file"
          accept=".csv,.txt,text/plain,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(file);
            }
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
