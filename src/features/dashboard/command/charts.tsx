export type Slice = { id?: string; label: string; value: number; color: string };

function centerTextClass(center: string, largeValues?: boolean) {
  const len = center.length;
  if (largeValues) {
    if (len >= 6) return "text-[8px]";
    if (len >= 5) return "text-[9px]";
    if (len >= 4) return "text-[10px]";
    return "text-[12px]";
  }
  if (len >= 5) return "text-[9px]";
  return "text-[11px]";
}

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
  const r = largeValues ? 15 : compact ? 16 : 18;
  const stroke = largeValues ? 4.5 : compact ? 6 : 7;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const safe =
    total === 0
      ? [{ label: "None", value: 1, color: "#e4e4e7" }]
      : slices.filter((s) => s.value > 0);
  const safeTotal = safe.reduce((n, s) => n + s.value, 0);

  return (
    <div className="flex w-full min-w-0 items-center gap-4">
      <svg
        viewBox="0 0 48 48"
        className={`shrink-0 ${
          largeValues ? "size-[6.75rem]" : compact ? "size-[5.25rem]" : "size-24"
        }`}
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
              strokeWidth={stroke}
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
            className={`fill-zinc-900 font-semibold tabular-nums ${centerTextClass(center, largeValues)}`}
          >
            {center}
          </text>
        )}
      </svg>
      {/* Vertically + horizontally centered in space beside donut; 1px between label & value */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <ul className="w-max space-y-2">
          {slices.map((s) => (
            <li
              key={s.label}
              className="flex items-center gap-4.5 whitespace-nowrap text-xs leading-none"
            >
              <span
                className="mr-1.5 size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="text-zinc-500">{s.label}</span>
              <span className="font-semibold tabular-nums text-zinc-900">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
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
        warn ? "border-amber-300/60 bg-amber-50/50" : "border-zinc-200 bg-zinc-50/70"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          warn ? "text-amber-700" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
