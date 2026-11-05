import type { B2cTypeProGateStatus } from "./b2cMetsightsProGate";

type Props = {
  statuses: B2cTypeProGateStatus[];
  activeTypeCode: string;
  onSelectType: (typeCode: string) => void;
  onApplyEssentialsToAll: () => void;
  essentialsAvailable: boolean;
  readOnly: boolean;
};

export function B2cOnboardingProGateSummary({
  statuses,
  activeTypeCode,
  onSelectType,
  onApplyEssentialsToAll,
  essentialsAvailable,
  readOnly,
}: Props) {
  if (statuses.length === 0) return null;

  const blockedCount = statuses.filter((s) => s.blocked).length;
  const activeRow = statuses.find((s) => s.typeCode === activeTypeCode);
  const activeOk = activeRow && !activeRow.blocked && !activeRow.isProSelected;

  return (
    <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">Metsights Pro checks (all Bio AI types)</p>
          <p className="text-xs text-zinc-600 mt-1">
            Save sends every engagement type at once. Each Bio AI tab must pass before Save defaults is enabled.
          </p>
        </div>
        {!readOnly && blockedCount > 0 && essentialsAvailable ? (
          <button
            type="button"
            onClick={onApplyEssentialsToAll}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800"
          >
            Use MetSights Essentials on all Bio AI types
          </button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {statuses.map((row) => {
          const isActive = row.typeCode === activeTypeCode;
          const ok = !row.blocked && (!row.isProSelected || row.allowed);
          return (
            <li
              key={row.typeCode}
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${
                isActive ? "font-medium text-zinc-900" : "text-zinc-700"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  row.isProSelected && row.loading
                    ? "bg-zinc-400 animate-pulse"
                    : ok
                      ? "bg-emerald-600"
                      : "bg-red-500"
                }`}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => onSelectType(row.typeCode)}
                className={`text-left underline-offset-2 hover:underline ${
                  isActive ? "no-underline" : ""
                }`}
              >
                {row.displayName}
                {isActive ? " (current)" : ""}
              </button>
              <span className="text-zinc-500">
                {row.isProSelected
                  ? row.blocked
                    ? `Metsights Pro · ${row.diagnosticPackageLabel} · missing ${row.missingLabels.join(", ") || "requirements"}`
                    : row.loading
                      ? "Checking hormones…"
                      : `Metsights Pro · ${row.diagnosticPackageLabel} · OK`
                  : "MetSights Essentials or other non-Pro assessment · OK"}
              </span>
            </li>
          );
        })}
      </ul>
      {activeOk && blockedCount > 0 ? (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          This tab is ready. Use the list above to open the tab marked in red and switch to MetSights Essentials, or
          use the button to fix all Bio AI types at once.
        </p>
      ) : null}
    </div>
  );
}
