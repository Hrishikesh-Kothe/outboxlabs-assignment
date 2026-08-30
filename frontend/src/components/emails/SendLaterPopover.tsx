import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (date: Date) => void;
};

function tomorrowAt(hours: number, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const PRESETS = [
  { label: "Tomorrow", date: () => tomorrowAt(9) },
  { label: "Tomorrow, 10:00 AM", date: () => tomorrowAt(10) },
  { label: "Tomorrow, 11:00 AM", date: () => tomorrowAt(11) },
  { label: "Tomorrow, 3:00 PM", date: () => tomorrowAt(15) },
];

export function SendLaterPopover({ open, onClose, onPick }: Props) {
  const [custom, setCustom] = useState("");

  if (!open) {
    return null;
  }

  return (
    <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl">
      <p className="font-semibold">Send Later</p>
      <label className="mt-3 block text-xs text-neutral-500">
        Pick date & time
        <input
          type="datetime-local"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg bg-neutral-100 px-3 text-sm outline-none"
        />
      </label>
      <ul className="mt-3 space-y-1 text-sm">
        {PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50"
              onClick={() => onPick(preset.date())}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-3 text-sm">
        <button type="button" onClick={onClose} className="text-neutral-500">
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#22A45A] px-3 py-1 font-medium text-[#22A45A]"
          onClick={() => {
            if (custom) {
              onPick(new Date(custom));
            }
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
