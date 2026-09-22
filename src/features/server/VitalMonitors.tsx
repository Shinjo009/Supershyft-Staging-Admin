import { useMemo } from "react";
import type { HealthRun, ServerHealthLatestMetrics } from "../../lib/api";

interface VitalMonitorProps {
  history: HealthRun[];
  loading?: boolean;
  latestMetrics?: ServerHealthLatestMetrics | null;
  thresholdPct?: number;
}

function buildPoints(
  values: Array<number | null | undefined>,
  width: number,
  height: number,
  pad = 8
): string {
  const usable = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  if (!usable.some((v) => v != null)) return "";

  const n = usable.length;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const maxY = 100;

  return usable
    .map((v, i) => {
      const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const yVal = v == null ? maxY / 2 : Math.min(maxY, Math.max(0, v));
      const y = pad + innerH - (yVal / maxY) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function thresholdY(thresholdPct: number, height: number, pad = 8): number {
  const innerH = height - pad * 2;
  const clamped = Math.min(100, Math.max(0, thresholdPct));
  return pad + innerH - (clamped / 100) * innerH;
}

function MonitorPanel({
  label,
  unit,
  latest,
  values,
  stroke,
  thresholdPct,
}: {
  label: string;
  unit: string;
  latest: number | null;
  values: Array<number | null | undefined>;
  stroke: string;
  thresholdPct?: number;
}) {
  const width = 480;
  const height = 120;
  const points = useMemo(() => buildPoints(values, width, height), [values]);
  const display = latest == null ? "—" : `${Math.round(latest)}${unit}`;
  const gradId = `fade-${label.replace(/\s+/g, "-")}`;
  const gridId = `grid-${label.replace(/\s+/g, "-")}`;
  const warn = thresholdPct != null && latest != null && latest >= thresholdPct;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0b1220] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: warn ? "#f87171" : stroke }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: warn ? "#f87171" : stroke }}
            />
          </span>
          <span className="text-xs font-semibold tracking-[0.14em] uppercase text-zinc-300">{label}</span>
        </div>
        <span
          className="text-2xl font-semibold tabular-nums tracking-tight"
          style={{ color: warn ? "#f87171" : stroke }}
        >
          {display}
        </span>
      </div>
      <div className="relative px-2 py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-28 block"
          role="img"
          aria-label={`${label} trend`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.05" />
              <stop offset="40%" stopColor={stroke} stopOpacity="0.9" />
              <stop offset="100%" stopColor={stroke} stopOpacity="1" />
            </linearGradient>
            <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1f2a3a" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill={`url(#${gridId})`} />
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#243044" strokeWidth="1" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#2b3a52" strokeWidth="1" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#243044" strokeWidth="1" />
          {thresholdPct != null ? (
            <line
              x1="0"
              y1={thresholdY(thresholdPct, height)}
              x2={width}
              y2={thresholdY(thresholdPct, height)}
              stroke="#f87171"
              strokeWidth="1.25"
              strokeDasharray="5 4"
              strokeOpacity="0.85"
            />
          ) : null}

          {points ? (
            <>
              <polyline
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              <polyline
                fill="none"
                stroke={stroke}
                strokeWidth="1"
                strokeOpacity="0.35"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
                style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
              />
            </>
          ) : (
            <text x={width / 2} y={height / 2} textAnchor="middle" fill="#64748b" fontSize="14">
              Waiting for samples…
            </text>
          )}

          <rect width="28" height={height} fill={stroke} opacity="0.08">
            <animate attributeName="x" from="-28" to={String(width)} dur="3.2s" repeatCount="indefinite" />
          </rect>
        </svg>
        <p className="px-2 pb-1 text-[11px] text-zinc-500">
          Last {values.length || 0} samples · 0–100{unit} scale · updates every health run (~15m)
          {thresholdPct != null ? ` · alert at ${Math.round(thresholdPct)}${unit}` : ""}
        </p>
      </div>
    </div>
  );
}

export function VitalMonitors({ history, loading, latestMetrics, thresholdPct = 75 }: VitalMonitorProps) {
  const chronological = useMemo(() => [...history].reverse(), [history]);
  const cpuValues = chronological.map((r) => r.cpu_pct ?? null);
  const memValues = chronological.map((r) => r.mem_pct ?? null);
  const storageValues = chronological.map((r) => r.storage_pct ?? null);
  const latestHistory = chronological.length ? chronological[chronological.length - 1] : null;
  const latestCpu = latestMetrics?.cpu_usage ?? latestHistory?.cpu_pct ?? null;
  const latestMem = latestMetrics?.memory_usage ?? latestHistory?.mem_pct ?? null;
  const latestStorage = latestMetrics?.storage_usage ?? latestHistory?.storage_pct ?? null;
  const loadPct =
    latestMetrics && latestMetrics.cores > 0
      ? Math.min(100, Math.max(0, (latestMetrics.load_1m / latestMetrics.cores) * 100))
      : null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-44 rounded-xl bg-zinc-900/80 animate-pulse" />
        <div className="h-44 rounded-xl bg-zinc-900/80 animate-pulse" />
        <div className="h-44 rounded-xl bg-zinc-900/80 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Live vitals</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          CPU, memory, and storage trends (hospital-monitor style). Storage is root filesystem usage.
          {latestMetrics
            ? ` Latest sample from ${latestMetrics.hostname} · load ${latestMetrics.load_1m.toFixed(2)} on ${latestMetrics.cores} cores.`
            : ""}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MonitorPanel
          label="CPU"
          unit="%"
          latest={latestCpu}
          values={cpuValues}
          stroke="#34d399"
          thresholdPct={thresholdPct}
        />
        <MonitorPanel
          label="Memory"
          unit="%"
          latest={latestMem}
          values={memValues}
          stroke="#38bdf8"
        />
        <MonitorPanel
          label="Storage"
          unit="%"
          latest={latestStorage}
          values={storageValues}
          stroke="#fbbf24"
        />
      </div>
      {latestMetrics ? (
        <p className="text-xs text-zinc-500">
          Load average {latestMetrics.load_1m.toFixed(2)} ({loadPct == null ? "—" : `${Math.round(loadPct)}%`} of
          core capacity).
        </p>
      ) : null}
    </div>
  );
}
