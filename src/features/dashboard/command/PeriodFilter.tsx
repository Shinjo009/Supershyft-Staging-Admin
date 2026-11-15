import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { PERIOD_PRESETS, type PeriodPreset } from "./period";

export function PeriodFilter({
  period,
  from,
  to,
  onPeriodChange,
  onCustomApply,
}: {
  period: PeriodPreset;
  from: string | null;
  to: string | null;
  onPeriodChange: (period: PeriodPreset) => void;
  onCustomApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from ?? "");
  const [draftTo, setDraftTo] = useState(to ?? "");
  const [error, setError] = useState("");

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <div
        className="flex flex-wrap items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5"
        role="group"
        aria-label="Date period"
      >
        {PERIOD_PRESETS.filter((p) => p.id !== "custom").map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => {
              setOpen(false);
              onPeriodChange(p.id);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              period === p.id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={period === "custom"}
          aria-expanded={open}
          onClick={() => {
            setDraftFrom(from ?? "");
            setDraftTo(to ?? "");
            setError("");
            setOpen((v) => !v);
          }}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            period === "custom"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          Custom
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-600">
              From
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              To
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900"
              />
            </label>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                onClick={() => {
                  if (!draftFrom || !draftTo) {
                    setError("Select both start and end dates");
                    return;
                  }
                  if (draftTo < draftFrom) {
                    setError("End date must be on or after start date");
                    return;
                  }
                  onCustomApply(draftFrom, draftTo);
                  setOpen(false);
                }}
              >
                Apply range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
