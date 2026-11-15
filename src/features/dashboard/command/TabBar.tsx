import type { DashboardTab } from "./period";

const TABS: { id: DashboardTab; label: string; enabled: boolean }[] = [
  { id: "overview", label: "Overview", enabled: true },
  { id: "b2b", label: "B2B", enabled: false },
  { id: "b2c", label: "B2C", enabled: false },
];

export function TabBar({
  active,
  onChange,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5"
      role="tablist"
      aria-label="Dashboard tabs"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!tab.enabled}
            title={tab.enabled ? undefined : "Coming soon"}
            onClick={() => {
              if (tab.enabled) onChange(tab.id);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              isActive
                ? "bg-zinc-900 text-white"
                : tab.enabled
                  ? "text-zinc-600 hover:text-zinc-900"
                  : "cursor-not-allowed text-zinc-400 opacity-60"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
