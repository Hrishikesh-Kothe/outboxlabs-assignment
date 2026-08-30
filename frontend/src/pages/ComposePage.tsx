import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RecipientChips } from "../components/emails/RecipientChips";
import { SendLaterPopover } from "../components/emails/SendLaterPopover";
import {
  createCampaign,
  createSender,
  listSenders,
  type Sender,
} from "../lib/api";
import { parseLeadFile, parseLeadText } from "../lib/parseLeads";

export function ComposePage() {
  const navigate = useNavigate();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [delaySec, setDelaySec] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("60");
  const [laterOpen, setLaterOpen] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void listSenders().then(async (list) => {
      if (list.length === 0) {
        const created = await createSender();
        setSenders([created]);
        setSenderId(created.id);
        return;
      }
      setSenders(list);
      setSenderId(list[0]?.id ?? "");
    });
  }, []);

  function addRecipient(value: string) {
    const parsed = parseLeadText(value);
    setRecipients((current) => [...new Set([...current, ...parsed])]);
  }

  async function submit(event: FormEvent, when: Date) {
    event.preventDefault();
    setError("");
    const html = bodyRef.current?.innerHTML ?? "";
    if (!senderId || !subject.trim() || recipients.length === 0) {
      setError("Add a subject and at least one recipient.");
      return;
    }
    setBusy(true);
    try {
      await createCampaign({
        senderId,
        subject: subject.trim(),
        body: html || "<p></p>",
        recipients,
        startTime: when.toISOString(),
        delayMs: Math.max(0, Number(delaySec || 0) * 1000),
        hourlyLimit: Number(hourlyLimit || 60),
      });
      navigate("/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6"
      onSubmit={(event) => submit(event, startTime ?? new Date())}
    >
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/inbox" className="text-xl text-neutral-500">
            ←
          </Link>
          <h1 className="text-lg font-semibold">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-neutral-500"
            onClick={() => setLaterOpen((value) => !value)}
            title="Send later"
          >
            ◷
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-[#22A45A] px-4 py-1.5 text-sm font-semibold text-[#22A45A] disabled:opacity-50"
          >
            {startTime ? "Send Later" : "Send"}
          </button>
          <SendLaterPopover
            open={laterOpen}
            onClose={() => setLaterOpen(false)}
            onPick={(date) => {
              setStartTime(date);
              setLaterOpen(false);
            }}
          />
        </div>
      </div>

      <label className="mt-6 flex items-center gap-3 border-b border-neutral-200 py-3 text-sm">
        <span className="w-14 text-neutral-500">From</span>
        <select
          value={senderId}
          onChange={(event) => setSenderId(event.target.value)}
          className="flex-1 bg-transparent outline-none"
        >
          {senders.map((sender) => (
            <option key={sender.id} value={sender.id}>
              {sender.email}
            </option>
          ))}
        </select>
      </label>

      <RecipientChips
        emails={recipients}
        onAdd={addRecipient}
        onUpload={(file) => {
          void parseLeadFile(file).then((emails) =>
            setRecipients((current) => [...new Set([...current, ...emails])]),
          );
        }}
      />

      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Subject"
        className="border-b border-neutral-200 py-3 text-sm outline-none"
      />

      <div className="flex flex-wrap items-center gap-6 py-3 text-sm text-neutral-600">
        <label className="flex items-center gap-2">
          Delay between 2 emails
          <input
            value={delaySec}
            onChange={(event) => setDelaySec(event.target.value)}
            className="h-8 w-14 rounded-md bg-neutral-100 text-center outline-none"
          />
        </label>
        <label className="flex items-center gap-2">
          Hourly Limit
          <input
            value={hourlyLimit}
            onChange={(event) => setHourlyLimit(event.target.value)}
            className="h-8 w-14 rounded-md bg-neutral-100 text-center outline-none"
          />
        </label>
        {recipients.length ? (
          <span className="text-xs text-neutral-400">
            {recipients.length} lead{recipients.length === 1 ? "" : "s"} detected
          </span>
        ) : null}
      </div>

      <div className="mt-2 rounded-xl bg-neutral-100">
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 px-3 py-2 text-xs text-neutral-500">
          {["bold", "italic", "underline"].map((command) => (
            <button
              key={command}
              type="button"
              className="rounded px-1.5 py-0.5 hover:bg-white"
              onClick={() => document.execCommand(command)}
            >
              {command[0]?.toUpperCase()}
            </button>
          ))}
        </div>
        <div
          ref={bodyRef}
          contentEditable
          data-placeholder="Type Your Reply..."
          className="min-h-[280px] px-4 py-3 text-sm outline-none empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)]"
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
