import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import {
  PERIOD_PRESETS,
  presetRange,
  todayKey,
  toKey,
  type DateRange,
  type PeriodPreset,
} from "./dates";

function MonthGrid({
  month,
  range,
  draftFrom,
  draftTo,
  onPick,
  onMonthChange,
}: {
  month: Date;
  range: DateRange;
  draftFrom: string | null;
  draftTo: string | null;
  onPick: (iso: string) => void;
  onMonthChange: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const start = draftFrom ?? range.from;
  const end = draftTo ?? draftFrom ?? range.to;

  return (
    <div className="w-[260px] p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md p-1 hover:bg-muted"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          className="rounded-md p-1 hover:bg-muted"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day == null) return <span key={`e-${idx}`} />;
          const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const inRange = start && end && iso >= start && iso <= end;
          const isEdge = iso === start || iso === end;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              className={cn(
                "h-8 rounded-md text-xs tabular-nums hover:bg-muted",
                inRange && "bg-primary/10",
                isEdge && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangeControl({
  preset,
  range,
  onChange,
}: {
  preset: PeriodPreset;
  range: DateRange;
  onChange: (preset: PeriodPreset, range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [draftTo, setDraftTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => new Date(`${range.from}T12:00:00`));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const a = triggerRef.current;
      const p = panelRef.current;
      if (!a || !p) return;
      const rect = a.getBoundingClientRect();
      const width = p.offsetWidth || 540;
      const height = p.offsetHeight || 360;
      let left = rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - height - 8);
      }
      setPos({ top, left, ready: true });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, month]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const month2 = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    [month],
  );

  const pick = (iso: string) => {
    setError("");
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(iso);
      setDraftTo(null);
      return;
    }
    if (iso < draftFrom) {
      setDraftFrom(iso);
      setDraftTo(draftFrom);
      return;
    }
    setDraftTo(iso);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex flex-wrap items-center gap-0.5 rounded-lg border bg-card p-0.5"
        role="group"
        aria-label="Date period"
      >
        {PERIOD_PRESETS.filter((p) => p.id !== "custom").map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setOpen(false);
              onChange(p.id, presetRange(p.id, todayKey()));
            }}
            aria-pressed={preset === p.id}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              preset === p.id && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          ref={triggerRef}
          type="button"
          aria-pressed={preset === "custom"}
          onClick={() => {
            setDraftFrom(range.from);
            setDraftTo(range.to);
            setError("");
            setMonth(new Date(`${range.from}T12:00:00`));
            setOpen((o) => !o);
          }}
          className={cn(
            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground",
            preset === "custom" && "bg-primary text-primary-foreground hover:text-primary-foreground",
          )}
        >
          <CalendarDays className="size-3.5" /> Custom
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: pos.top, left: pos.left, visibility: pos.ready ? "visible" : "hidden" }}
            className="fixed z-[60] w-auto rounded-xl border bg-card shadow-lg"
          >
            <div className="flex flex-col sm:flex-row">
              <MonthGrid
                month={month}
                range={range}
                draftFrom={draftFrom}
                draftTo={draftTo}
                onPick={pick}
                onMonthChange={setMonth}
              />
              <MonthGrid
                month={month2}
                range={range}
                draftFrom={draftFrom}
                draftTo={draftTo}
                onPick={pick}
                onMonthChange={(d) => setMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2.5">
              <span className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
                {error ||
                  (draftFrom
                    ? `${draftFrom} → ${draftTo ?? "pick end"}`
                    : "Pick a start date")}
              </span>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                onClick={() => {
                  if (!draftFrom) {
                    setError("Select a start date");
                    return;
                  }
                  const to = draftTo ?? draftFrom;
                  onChange("custom", { from: draftFrom, to });
                  setOpen(false);
                }}
              >
                Apply range
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

void toKey;
