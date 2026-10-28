import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  diagnosticPackagesApi,
  getApiError,
  type DiagnosticPackageDetail,
  type DiagnosticPackageListItem,
  type DiagnosticPackagePeer,
} from "../../lib/api";
import { PermissionGate } from "../../contexts/PermissionContext";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";
import { resolveGroupDefaultPackageId } from "./diagnosticPackageFormData";

type SwitcherPackage = Pick<
  DiagnosticPackageListItem,
  "diagnostic_package_id" | "diagnostic_provider" | "price" | "status" | "is_default_for_group"
>;

export type PackageProviderSwitcherProps = {
  currentPackageId: number;
  detail: Pick<
    DiagnosticPackageDetail,
    "same_packages" | "diagnostic_provider" | "diagnostic_package_id" | "is_default_for_group" | "package_name"
  > &
    SwitcherPackage;
  mode: "view" | "edit";
  isDirty?: boolean;
  onSetDefaultComplete?: () => void;
  catalogProductName?: string;
  labCount?: number;
};

function buildProviderOptions(
  current: SwitcherPackage,
  peers: DiagnosticPackagePeer[] | undefined
): SwitcherPackage[] {
  const peerRows: SwitcherPackage[] = (peers ?? []).map((peer) => ({
    diagnostic_package_id: peer.diagnostic_package_id,
    diagnostic_provider: peer.diagnostic_provider,
    price: peer.price ?? null,
    status: peer.status ?? "active",
    is_default_for_group: peer.is_default_for_group ?? false,
  }));
  const all = [current, ...peerRows.filter((p) => p.diagnostic_package_id !== current.diagnostic_package_id)];
  return all.sort((a, b) =>
    diagnosticProviderDisplayLabel(a.diagnostic_provider).localeCompare(
      diagnosticProviderDisplayLabel(b.diagnostic_provider)
    )
  );
}

export function PackageProviderSwitcher({
  currentPackageId,
  detail,
  mode,
  isDirty = false,
  onSetDefaultComplete,
  catalogProductName,
  labCount,
}: PackageProviderSwitcherProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => buildProviderOptions(detail, detail.same_packages),
    [detail]
  );

  const selected = options.find((row) => row.diagnostic_package_id === currentPackageId) ?? detail;
  const defaultPackageId = resolveGroupDefaultPackageId(detail);
  const productName = catalogProductName ?? detail.package_name;
  const labsInProduct = labCount ?? options.length;
  const inMultiLabGroup = labsInProduct > 1 || (detail.same_packages?.length ?? 0) > 0;
  const showMoreActions = !selected.is_default_for_group;

  const navigateTo = (packageId: number) => {
    if (packageId === currentPackageId) return;
    if (isDirty && !window.confirm("Discard unsaved changes and switch provider?")) return;
    const tab = searchParams.get("tab");
    const suffix = mode === "edit" ? "/edit" : tab ? `?tab=${encodeURIComponent(tab)}` : "";
    navigate(`/diagnostics/packages/${packageId}${suffix}`);
  };

  const setAsDefault = async () => {
    setSettingDefault(true);
    setError(null);
    try {
      await diagnosticPackagesApi.update(currentPackageId, { is_default_for_group: true });
      setMenuOpen(false);
      onSetDefaultComplete?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSettingDefault(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 space-y-3">
      {inMultiLabGroup ? (
        <p className="text-sm text-zinc-700">
          Package:{" "}
          <Link
            to={`/diagnostics/packages/${defaultPackageId}`}
            className="font-medium text-zinc-900 underline underline-offset-2"
          >
            {productName}
          </Link>
          {labsInProduct > 1 ? (
            <span className="text-zinc-500"> · {labsInProduct} labs</span>
          ) : null}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Lab provider</p>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((row) => {
          const active = row.diagnostic_package_id === currentPackageId;
          const inactive = (row.status ?? "").toLowerCase() !== "active";
          return (
            <button
              key={row.diagnostic_package_id}
              type="button"
              onClick={() => navigateTo(row.diagnostic_package_id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              } ${inactive && !active ? "opacity-60" : ""}`}
            >
              <span>{diagnosticProviderDisplayLabel(row.diagnostic_provider)}</span>
              {row.price != null ? <span className="text-xs opacity-80">₹{row.price}</span> : null}
              {row.is_default_for_group ? (
                <span
                  className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    active ? "bg-white/20" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  Default
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showMoreActions ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900"
          >
            More actions
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 mt-1 z-10 min-w-[14rem] rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
              <PermissionGate category="diagnostics" action="edit">
                <button
                  type="button"
                  disabled={settingDefault}
                  onClick={() => void setAsDefault()}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {settingDefault ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Setting…
                    </span>
                  ) : (
                    "Set as default package"
                  )}
                </button>
              </PermissionGate>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
