import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Plus, Search } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import {
  diagnosticPackagesApi,
  getApiError,
  type DiagnosticPackageListItem,
} from "../../lib/api";
import { DiagnosticFilterChips } from "./DiagnosticFilterChips";
import { DiagnosticTests } from "./DiagnosticTests";
import { DiagnosticTestGroups } from "./DiagnosticTestGroups";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";

type TabKey = "packages" | "test-groups" | "tests" | "filter-chips";

function formatAlsoOfferedBy(row: DiagnosticPackageListItem): string {
  const peers = row.same_packages ?? [];
  if (peers.length === 0) return "—";
  return peers.map((peer) => diagnosticProviderDisplayLabel(peer.diagnostic_provider)).join(", ");
}

function sortPackagesByDisplayOrder(items: DiagnosticPackageListItem[]) {
  return [...items].sort((a, b) => {
    const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return b.diagnostic_package_id - a.diagnostic_package_id;
  });
}

export function DiagnosticPackages() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEditDiagnostics = canEditTask("diagnostics", "packages");
  const [activeTab, setActiveTab] = useState<TabKey>("packages");
  const [rows, setRows] = useState<DiagnosticPackageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [reorderingPackages, setReorderingPackages] = useState(false);
  const [openCreateTestGroup, setOpenCreateTestGroup] = useState<(() => void) | null>(null);
  const [openCreateTest, setOpenCreateTest] = useState<(() => void) | null>(null);

  const fetchPackages = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await diagnosticPackagesApi.list({ include_inactive: true, type: "public_package" });
      const baseRows = sortPackagesByDisplayOrder(res.data.data ?? []);
      setRows(baseRows);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === "packages") {
      void fetchPackages();
    }
  }, [activeTab, fetchPackages]);

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((row) =>
            (row.tags ?? [])
              .map((tag) => tag.tag_name?.trim())
              .filter((tagName): tagName is string => !!tagName)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const providerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.diagnostic_provider?.trim())
            .filter((provider): provider is string => !!provider)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const genderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.gender_suitability?.trim().toLowerCase())
            .filter((gender): gender is string => !!gender)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const canReorderPackages = useMemo(
    () => !search.trim() && !tagFilter && !providerFilter && !genderFilter && !statusFilter,
    [search, tagFilter, providerFilter, genderFilter, statusFilter]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (q && !row.package_name.toLowerCase().includes(q)) return false;
      if (providerFilter && (row.diagnostic_provider?.trim() ?? "") !== providerFilter) return false;
      if (genderFilter && (row.gender_suitability?.trim().toLowerCase() ?? "") !== genderFilter) return false;
      if (statusFilter && (row.status?.trim().toLowerCase() ?? "") !== statusFilter) return false;
      if (tagFilter && !(row.tags ?? []).some((tag) => (tag.tag_name?.trim() ?? "") === tagFilter)) return false;
      return true;
    });
  }, [rows, search, providerFilter, genderFilter, statusFilter, tagFilter]);

  const openView = (row: DiagnosticPackageListItem) => {
    navigate(`/diagnostics/packages/${row.diagnostic_package_id}`);
  };

  const openEdit = (row: DiagnosticPackageListItem) => {
    navigate(`/diagnostics/packages/${row.diagnostic_package_id}/edit`);
  };

  const openCreate = () => {
    navigate("/diagnostics/packages/new");
  };

  const toggleStatus = async (row: DiagnosticPackageListItem) => {
    const next = (row.status ?? "active").toLowerCase() === "active" ? "inactive" : "active";
    setUpdatingStatusId(row.diagnostic_package_id);
    try {
      await diagnosticPackagesApi.updateStatus(row.diagnostic_package_id, next);
      await fetchPackages();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handlePackageReorder = async (newOrderKeys: (string | number)[]) => {
    const packageIds = newOrderKeys.map((id) => Number(id));
    if (packageIds.length < 2) return;
    const previous = [...rows];
    const byId = new Map(rows.map((row) => [row.diagnostic_package_id, row]));
    const reordered = packageIds
      .map((id) => byId.get(id))
      .filter((row): row is DiagnosticPackageListItem => Boolean(row))
      .map((row, index) => ({ ...row, display_order: index + 1 }));
    const reorderedIds = new Set(packageIds);
    const rest = rows.filter((row) => !reorderedIds.has(row.diagnostic_package_id));
    setRows([...reordered, ...rest]);
    setReorderingPackages(true);
    setError(null);
    try {
      await diagnosticPackagesApi.reorder({ package_ids: packageIds });
      await fetchPackages({ silent: true });
    } catch (err) {
      setRows(previous);
      setError(getApiError(err));
    } finally {
      setReorderingPackages(false);
    }
  };

  const handleDeletePackage = async (row: DiagnosticPackageListItem) => {
    if (!window.confirm(`Delete package "${row.package_name}"? This action cannot be undone.`)) return;
    try {
      await diagnosticPackagesApi.delete(row.diagnostic_package_id);
      await fetchPackages();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleDuplicatePackage = async (row: DiagnosticPackageListItem) => {
    try {
      setLoading(true);
      await diagnosticPackagesApi.duplicate(row.diagnostic_package_id);
      await fetchPackages();
    } catch (err) {
      setError(getApiError(err));
      setLoading(false);
    }
  };

  const columns: Column<DiagnosticPackageListItem>[] = [
    {
      key: "package_name",
      label: "Package name",
      render: (row) => {
        const unmapped = row.unmapped_test_count ?? 0;
        const total = row.no_of_tests ?? 0;
        const mapped = Math.max(total - unmapped, 0);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openView(row);
            }}
            className="inline-flex items-center gap-1.5 font-medium text-zinc-900 hover:underline text-left"
          >
            {row.package_name}
            {unmapped > 0 && (
              <span
                title={`${mapped} of ${total} tests mapped`}
                aria-label={`${mapped} of ${total} tests mapped`}
                className="inline-flex text-amber-600"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
              </span>
            )}
          </button>
        );
      },
    },
    {
      key: "diagnostic_provider",
      label: "Provider",
      render: (row) => row.diagnostic_provider?.trim() || "—",
      hideOnMobile: true,
    },
    {
      key: "same_packages",
      label: "Also offered by",
      render: (row) => formatAlsoOfferedBy(row),
      hideOnTablet: true,
    },
    { key: "no_of_tests", label: "Tests", render: (row) => row.no_of_tests ?? "—", hideOnMobile: true },
    {
      key: "price",
      label: "Price",
      render: (row) => (row.price != null ? `₹${row.price}` : "—"),
    },
    {
      key: "discount_percent",
      label: "Discount",
      render: (row) =>
        row.discount_percent != null ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            {row.discount_percent}% OFF
          </span>
        ) : (
          "—"
        ),
      hideOnTablet: true,
    },
    {
      key: "gender_suitability",
      label: "Gender",
      render: (row) =>
        row.gender_suitability ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
            {row.gender_suitability}
          </span>
        ) : (
          "—"
        ),
      hideOnTablet: true,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => mayEditDiagnostics ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void toggleStatus(row);
          }}
          disabled={updatingStatusId === row.diagnostic_package_id}
          className={`inline-flex items-center w-12 h-6 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
            (row.status ?? "").toLowerCase() === "active" ? "bg-emerald-500" : "bg-zinc-300"
          }`}
          aria-pressed={(row.status ?? "").toLowerCase() === "active"}
          aria-label={`Set ${row.package_name} ${(row.status ?? "").toLowerCase() === "active" ? "inactive" : "active"}`}
        >
          <span
            className={`h-5 w-5 bg-white rounded-full shadow transform transition-transform ${
              (row.status ?? "").toLowerCase() === "active" ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
      ) : (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          (row.status ?? "").toLowerCase() === "active"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-zinc-100 text-zinc-600"
        }`}>
          {(row.status ?? "").toLowerCase() === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "collection_type", label: "Collection", render: (row) => row.collection_type ?? "—", hideOnTablet: true },
  ];

  return (
    <div>
      <PageHeaderActions>
        <PermissionGate category="diagnostics" action="edit">
          {activeTab === "packages" && (
            <HeaderActionButton label="Add Package" icon={Plus} onClick={openCreate} />
          )}
          {activeTab === "test-groups" && (
            <HeaderActionButton label="Add Test Group" icon={Plus} onClick={() => openCreateTestGroup?.()} />
          )}
          {activeTab === "tests" && (
            <HeaderActionButton label="Add Test" icon={Plus} onClick={() => openCreateTest?.()} />
          )}
        </PermissionGate>
      </PageHeaderActions>

      <div className="flex gap-1 mb-5 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "packages"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Packages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("test-groups")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "test-groups"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Test Groups
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tests")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "tests"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Tests
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("filter-chips")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "filter-chips"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Filter chips
        </button>
      </div>

      {activeTab === "packages" ? (
        <div>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                placeholder="Search package name..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All tags</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All providers</option>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All genders</option>
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All status</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {canReorderPackages && !loading && filteredRows.length > 1 && (
              <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-100">
                {reorderingPackages ? "Saving order…" : "Drag the handle to reorder packages."}
              </p>
            )}
            {loading ? (
              <div className="py-14 flex justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredRows}
                keyExtractor={(row) => row.diagnostic_package_id}
                onView={openView}
                onEdit={openEdit}
                onDuplicate={handleDuplicatePackage}
                onDelete={handleDeletePackage}
                onReorder={
                  canReorderPackages && filteredRows.length > 1 && !reorderingPackages
                    ? handlePackageReorder
                    : undefined
                }
                firstColumnClickableView
              />
            )}
          </div>
        </div>
      ) : activeTab === "test-groups" ? (
        <DiagnosticTestGroups onRequestCreate={(trigger) => setOpenCreateTestGroup(() => trigger)} />
      ) : activeTab === "tests" ? (
        <DiagnosticTests onRequestCreate={(trigger) => setOpenCreateTest(() => trigger)} />
      ) : (
        <DiagnosticFilterChips embedded />
      )}
    </div>
  );
}
