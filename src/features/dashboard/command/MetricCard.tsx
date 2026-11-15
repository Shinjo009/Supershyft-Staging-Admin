import type { ReactNode } from "react";

export function MetricCard({
  title,
  children,
  onClick,
  clickable,
  "data-testid": testId,
}: {
  title: string;
  children?: ReactNode;
  onClick?: () => void;
  clickable?: boolean;
  "data-testid"?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {clickable ? (
          <span className="text-xs font-medium text-zinc-500">View all</span>
        ) : null}
      </div>
      <div className="flex min-h-[7.5rem] flex-1 items-center px-3 py-3">{children}</div>
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        className="flex h-full w-full flex-col rounded-xl border border-zinc-200 bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
      className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      {body}
    </div>
  );
}
