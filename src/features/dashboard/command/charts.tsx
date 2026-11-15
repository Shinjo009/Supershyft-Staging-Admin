export type Slice = { id?: string; label: string; value: number; color: string };

export function MiniDonut({
  slices,
  center,
  compact,
  largeValues,
}: {
  slices: Slice[];
  center?: string;
  compact?: boolean;
  largeValues?: boolean;
}) {
  const total = slices.reduce((n, s) => n + Math.max(0, s.value), 0);
  const r = compact ? 16 : 18;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const safe =
    total === 0
      ? [{ label: "None", value: 1, color: "#e4e4e7" }]
      : slices.filter((s) => s.value > 0);
  const safeTotal = safe.reduce((n, s) => n + s.value, 0);

  return (
    <div
      className={`flex items-center ${largeValues ? "gap-5" : compact ? "gap-3" : "gap-4"}`}
    >
      <svg
        viewBox="0 0 48 48"
        className={`shrink-0 ${largeValues ? "size-32" : compact ? "size-[5.25rem]" : "size-24"}`}
        aria-hidden
      >
        {safe.map((s) => {
          const len = (s.value / safeTotal) * c;
          const el = (
            <circle
              key={s.label}
              cx="24"
              cy="24"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={compact ? 6 : 7}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 24 24)"
            />
          );
          offset += len;
          return el;
        })}
        {center != null && (
          <text
            x="24"
            y="27"
            textAnchor="middle"
            className={`fill-zinc-900 font-semibold ${largeValues ? "text-[13px]" : "text-[11px]"}`}
          >
            {center}
          </text>
        )}
      </svg>
      <ul className={`min-w-0 flex-1 ${largeValues ? "space-y-2.5" : "space-y-1.5"}`}>
        {slices.map((s) => (
          <li
            key={s.label}
            className={`flex items-center justify-between gap-3 ${largeValues ? "text-sm" : "text-xs"}`}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate text-zinc-500">
              <span
                className={`shrink-0 rounded-full ${largeValues ? "size-2.5" : "size-2"}`}
                style={{ background: s.color }}
              />
              {s.label}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap font-semibold tabular-nums text-zinc-900 ${
                largeValues ? "text-xl" : ""
              }`}
            >
              {s.value}
              {total ? (
                <span
                  className={`font-normal text-zinc-500 ${largeValues ? "text-base" : ""}`}
                >
                  {" "}
                  · {Math.round((s.value / total) * 100)}%
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        warn ? "border-amber-300/60 bg-amber-50/50" : "border-zinc-200 bg-zinc-50/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          warn ? "text-amber-700" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
