import type { B2cTypeProGateStatus } from "./b2cMetsightsProGate";
import { hormonePresenceRows } from "./b2cMetsightsProGate";

type Props = {
  activeStatus: B2cTypeProGateStatus | undefined;
  parameterKeys: Set<string>;
};

export function MetsightsProOnboardingCallout({ activeStatus, parameterKeys }: Props) {
  if (!activeStatus?.isProSelected) return null;

  const rows = hormonePresenceRows(parameterKeys);
  const scopeLabel =
    activeStatus.packageMode === "split"
      ? "the female diagnostic package (used for women)"
      : "this diagnostic package (also used for women in one-package mode)";

  return (
    <div
      className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
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
                className={`inline-block w-2 h-2 rounded-full ${row.present ? "bg-emerald-600" : "bg-red-500"}`}
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
    </div>
  );
}