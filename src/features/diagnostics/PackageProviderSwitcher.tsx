import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import {
  diagnosticPackagesApi,
  getApiError,
  type DiagnosticPackageDetail,
  type DiagnosticPackageListItem,
  type DiagnosticPackagePeer,
} from "../../lib/api";
import { PermissionGate } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
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
  onPackageDeleted?: () => void;
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
  onPackageDeleted,
  catalogProductName,
  labCount,
}: PackageProviderSwitcherProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SwitcherPackage | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const packagePath = (packageId: number) => {
    const tab = searchParams.get("tab");
    const suffix = mode === "edit" ? "/edit" : tab ? `?tab=${encodeURIComponent(tab)}` : "";
    return `/diagnostics/packages/${packageId}${suffix}`;
  };

  const navigateTo = (packageId: number) => {
    if (packageId === currentPackageId) return;
    if (isDirty && !window.confirm("Discard unsaved changes and switch provider?")) return;
    navigate(packagePath(packageId));
  };

  const navigateToAddPackage = () => {
    if (mode === "edit" && isDirty && !window.confirm("Discard unsaved changes and add a package?")) {
      return;
    }
    navigate(`/diagnostics/packages/new?join_default_id=${defaultPackageId}`);
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const deletedId = pendingDelete.diagnostic_package_id;
    setDeleting(true);
    setError(null);
    try {
      await diagnosticPackagesApi.delete(deletedId);
      setPendingDelete(null);
      const remaining = options.filter((o) => o.diagnostic_package_id !== deletedId);
      onPackageDeleted?.();
      if (deletedId === currentPackageId) {
        if (remaining.length > 0) {
          const target = remaining.find((r) => r.is_default_for_group) ?? remaining[0];
          navigate(packagePath(target.diagnostic_package_id));
        } else {
          navigate("/diagnostics/packages");
        }
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const deleteModalBody = pendingDelete ? (
    <>
      Delete {diagnosticProviderDisplayLabel(pendingDelete.diagnostic_provider)} for &ldquo;{productName}
      &rdquo;? This permanently removes this package&apos;s reasons, tags, samples, preparations, filter links,
      and test assignments.
      {options.length > 1 ? " Other labs in this product will remain." : ""}
    </>
  ) : null;

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
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate category="diagnostics" action="edit">
            <button
              type="button"
              onClick={navigateToAddPackage}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add package
            </button>
          </PermissionGate>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((row) => {
          const active = row.diagnostic_package_id === currentPackageId;
          const inactive = (row.status ?? "").toLowerCase() !== "active";
          return (
            <div
              key={row.diagnostic_package_id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
              } ${inactive && !active ? "opacity-60" : ""}`}
            >
              <button
                type="button"
                onClick={() => navigateTo(row.diagnostic_package_id)}
                className={`inline-flex items-center gap-1.5 min-w-0 ${
                  active ? "text-white" : "text-inherit"
                }`}
              >
                <span>{diagnosticProviderDisplayLabel(row.diagnostic_provider)}</span>
              </button>
              <PermissionGate category="diagnostics" action="edit">
                <button
                  type="button"
                  aria-label={`Delete ${diagnosticProviderDisplayLabel(row.diagnostic_provider)} package`}
                  onClick={() => setPendingDelete(row)}
                  className={`inline-flex p-0.5 rounded shrink-0 ${
                    active ? "text-white/80 hover:text-white" : "text-zinc-400 hover:text-red-600"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </PermissionGate>
              {row.is_default_for_group ? (
                <span
                  className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    active ? "bg-white/20" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  Default
                </span>
              ) : null}
            </div>
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

      {pendingDelete != null ? (
        <Modal
          open={pendingDelete != null}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
          title="Delete lab package"
        >
          <p className="text-sm text-zinc-600 mb-4">{deleteModalBody}</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
