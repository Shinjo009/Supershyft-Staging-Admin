import type { B2cTypeProGateStatus } from "./b2cMetsightsProGate";
import { hormonePresenceRows } from "./b2cMetsightsProGate";

type Props = {
  activeStatus: B2cTypeProGateStatus | undefined;
  blockedTypes: B2cTypeProGateStatus[];
  parameterKeys: Set<string>;
  onSelectType: (typeCode: string) => void;
};

export function MetsightsProOnboardingCallout({
  activeStatus,
  blockedTypes,
  parameterKeys,
  onSelectType,
}: Props) {
  if (!activeStatus?.isProSelected) {
    if (blockedTypes.length === 0) return null;
    return (
      <div
        className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-medium">Metsights Pro is blocked on other engagement types</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          {blockedTypes.map((row) => (
            <li key={row.typeCode}>
              <button
                type="button"
                className="text-left underline underline-offset-2 hover:text-amber-900"
                onClick={() => onSelectType(row.typeCode)}
              >
                {row.displayName}
              </button>
              :{" "}
              {row.missingLabels.length > 0
                ? `missing ${row.missingLabels.join(", ")}`
                : "select a diagnostic package"}{" "}
              on {row.diagnosticPackageLabel}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const rows = hormonePresenceRows(parameterKeys);
  const scopeLabel =
    activeStatus.packageMode === "split"
      ? "the female diagnostic package (used for women)"
      : "this diagnostic package (also used for women in one-package mode)";

  return (
    <div
      className={`sm:col-span-2 rounded-lg border px-4 py-3 text-sm ${
        activeStatus.blocked
          ? "border-red-200 bg-red-50 text-red-950"
          : activeStatus.loading
            ? "border-zinc-200 bg-zinc-50 text-zinc-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-950"
      }`}
      role="status"
    >
      <p className="font-medium">
        {activeStatus.loading
          ? "Checking Metsights Pro requirements…"
          : activeStatus.blocked
            ? "Metsights Pro cannot be saved with this diagnostic package"
            : "Diagnostic package supports Metsights Pro"}
      </p>
      <p className="mt-1 text-xs opacity-90">
        Checking {scopeLabel}: {activeStatus.diagnosticPackageLabel}
      </p>
      {!activeStatus.loading && activeStatus.proGatePackageId ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {rows.map((row) => (
            <li key={row.label} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  row.present ? "bg-emerald-600" : "bg-red-500"
                }`}
                aria-hidden
              />
              {row.label}
              {row.present ? " included" : " missing"}
            </li>
          ))}
        </ul>
      ) : null}
      {activeStatus.blocked ? (
        <p className="mt-3 text-xs">
          Choose MetSights Essentials (or another non-Pro assessment), or switch to a diagnostic package that includes
          LH, FSH, and total testosterone (for example a female performance panel).
        </p>
      ) : null}
      {blockedTypes.filter((b) => b.typeCode !== activeStatus.typeCode).length > 0 ? (
        <p className="mt-3 text-xs font-medium">
          Also fix:{" "}
          {blockedTypes
            .filter((b) => b.typeCode !== activeStatus.typeCode)
            .map((b) => b.displayName)
            .join(", ")}
        </p>
      ) : null}
    </div>
  );
}
