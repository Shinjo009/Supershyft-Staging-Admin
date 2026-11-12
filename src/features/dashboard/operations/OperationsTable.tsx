import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface OperationsColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export type RowTooltipParts = Array<[string, string]>;

interface OperationsTableProps<T> {
  columns: OperationsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick: (row: T) => void;
  /** Full-row hover preview (label/value pairs). */
  rowTooltip?: (row: T) => RowTooltipParts;
}

type HoverTooltip = {
  key: string | number;
  titleLabel: string;
  titleValue: string;
  fields: RowTooltipParts;
  top: number;
  left: number;
  placement: "above" | "below";
};

const SuppressCellTitleContext = createContext(false);

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 10;
const VIEWPORT_PAD = 12;
const SHOW_DELAY_MS = 180;

export function OperationsTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowTooltip,
}: OperationsTableProps<T>) {
  const [hover, setHover] = useState<HoverTooltip | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef<string | number | null>(null);

  const clearShowTimer = () => {
    if (showTimerRef.current != null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const hideTooltip = () => {
    clearShowTimer();
    activeKeyRef.current = null;
    setHover(null);
  };

  useEffect(() => {
    if (!hover) return;
    const clear = () => {
      clearShowTimer();
      activeKeyRef.current = null;
      setHover(null);
    };
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, [hover]);

  useEffect(() => () => clearShowTimer(), []);

  const scheduleShow = (row: T, el: HTMLTableRowElement) => {
    if (!rowTooltip) return;
    const key = rowKey(row);
    if (activeKeyRef.current === key && hover) return;

    clearShowTimer();
    activeKeyRef.current = key;
    showTimerRef.current = setTimeout(() => {
      const parts = rowTooltip(row).map(([label, value]) => [label, value || "—"] as [string, string]);
      if (parts.length === 0) return;

      const [title, ...fields] = parts;
      const rect = el.getBoundingClientRect();
      const half = TOOLTIP_WIDTH / 2;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, half + VIEWPORT_PAD),
        window.innerWidth - half - VIEWPORT_PAD
      );

      const estimatedHeight = 72 + fields.length * 36;
      const spaceAbove = rect.top - VIEWPORT_PAD;
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
      const placeAbove = spaceAbove >= estimatedHeight + TOOLTIP_GAP || spaceAbove >= spaceBelow;
      const top = placeAbove ? rect.top - TOOLTIP_GAP : rect.bottom + TOOLTIP_GAP;

      setHover({
        key,
        titleLabel: title[0],
        titleValue: title[1],
        fields,
        top,
        left,
        placement: placeAbove ? "above" : "below",
      });
    }, SHOW_DELAY_MS);
  };

  return (
    <SuppressCellTitleContext.Provider value={Boolean(rowTooltip)}>
      <div className="overflow-x-auto -mx-1">
        <table className="min-w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-2 py-1.5 font-medium whitespace-nowrap ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-zinc-100 cursor-pointer hover:bg-zinc-50"
                onClick={() => onRowClick(row)}
                onMouseEnter={(event) => scheduleShow(row, event.currentTarget)}
                onMouseLeave={hideTooltip}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 py-2 align-middle text-zinc-800 whitespace-nowrap ${column.className ?? ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hover
        ? createPortal(
            <div
              key={hover.key}
              role="tooltip"
              className={`pointer-events-none fixed z-[80] w-80 -translate-x-1/2 transition-opacity duration-150 ${
                hover.placement === "above" ? "-translate-y-full" : ""
              }`}
              style={{ top: hover.top, left: hover.left }}
            >
              <div className="relative rounded-xl bg-zinc-900 px-3.5 py-3 shadow-2xl ring-1 ring-white/10">
                <div
                  className={`absolute left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 bg-zinc-900 ring-1 ring-white/10 ${
                    hover.placement === "above" ? "bottom-[-5px]" : "top-[-5px]"
                  }`}
                />
                <div className="relative">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">{hover.titleLabel}</p>
                  <p className="mt-0.5 text-sm font-semibold text-white break-words leading-snug">
                    {hover.titleValue}
                  </p>
                  {hover.fields.length > 0 ? (
                    <dl className="mt-2.5 space-y-2 border-t border-white/10 pt-2.5">
                      {hover.fields.map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
                          <dd className="mt-0.5 text-xs text-zinc-100 break-words leading-snug">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </SuppressCellTitleContext.Provider>
  );
}

export function TruncateText({ children, className = "" }: { children: ReactNode; className?: string }) {
  const suppressTitle = useContext(SuppressCellTitleContext);
  return (
    <span
      className={`block truncate max-w-[14rem] ${className}`}
      title={!suppressTitle && typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

function formatStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusPill({ label, tone }: { label: string; tone: "amber" | "red" | "emerald" | "zinc" }) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    emerald: "bg-emerald-100 text-emerald-800",
    zinc: "bg-zinc-100 text-zinc-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {formatStatusLabel(label)}
    </span>
  );
}
