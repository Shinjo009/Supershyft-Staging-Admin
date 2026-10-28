import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2, Plus, Search } from "lucide-react";
import { HeaderActionButton } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import {
  diagnosticPackagesApi,
  getApiError,
  type DiagnosticPackageGroupListItem,
} from "../../lib/api";
import { DiagnosticsCatalogShell } from "./DiagnosticsCatalogShell";
import {
  DIAGNOSTICS_CATALOG_PATHS,
  type DiagnosticsCatalogTab,
} from "./diagnosticsCatalogPaths";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";
const SEARCH_DEBOUNCE_MS = 300;
const PROVIDER_FILTER_OPTIONS = ["healthians", "Healthians", "orange_health"];
const GENDER_FILTER_OPTIONS = ["male", "female", "both"];

export function DiagnosticPackages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canEditTask } = usePermissions();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || tab === "packages") return;
    const path = DIAGNOSTICS_CATALOG_PATHS[tab as DiagnosticsCatalogTab];
    if (path) navigate(path, { replace: true });
  }, [searchParams, navigate]);
  const mayEditDiagnostics = canEditTask("diagnostics", "packages");
  const [rows, setRows] = useState<DiagnosticPackageGroupListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticPackagesApi.listGroups({
        include_inactive: true,
        type: "public_package",
        page,
        limit: LIST_LIMIT,
        search: debouncedSearch || undefined,
        tag: tagFilter || undefined,
        diagnostic_provider: providerFilter || undefined,
        gender: genderFilter || undefined,
        status: statusFilter || undefined,
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
      const tags = res.data.meta?.filter_options?.tags;
      if (tags) setTagOptions(tags);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tagFilter, providerFilter, genderFilter, statusFilter]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tagFilter, providerFilter, genderFilter, statusFilter]);

  const openView = (row: DiagnosticPackageGroupListItem) => {
    navigate(`/diagnostics/packages/${row.diagnostic_package_id}`);
  };

  const openEdit = (row: DiagnosticPackageGroupListItem) => {
    navigate(`/diagnostics/packages/${row.diagnostic_package_id}/edit`);
  };

  const openCreate = () => {
    navigate("/diagnostics/packages/new");
  };

  const toggleStatus = async (row: DiagnosticPackageGroupListItem) => {
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

  const handleDeletePackage = async (row: DiagnosticPackageGroupListItem) => {
    const labCount = Object.keys(row.package_group ?? {}).length;
    const labNote =
      labCount > 1
        ? " Other labs in this group will remain."
        : "";
    if (
      !window.confirm(
        `Delete "${row.package_name}"? This removes only this lab's package row.${labNote} This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await diagnosticPackagesApi.delete(row.diagnostic_package_id);
      await fetchPackages();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleDuplicatePackage = async (row: DiagnosticPackageGroupListItem) => {
    try {
      setLoading(true);
      await diagnosticPackagesApi.duplicate(row.diagnostic_package_id);
      await fetchPackages();
    } catch (err) {
      setError(getApiError(err));
      setLoading(false);
    }
  };

  const columns: Column<DiagnosticPackageGroupListItem>[] = [
    {
      key: "package_name",
      label: "Package name",
      render: (row) => {
        const unmapped = row.unmapped_test_count ?? 0;
        const total = row.no_of_tests ?? 0;
        const mapped = Math.max(total - unmapped, 0);
        const labCount = Object.keys(row.package_group ?? {}).length;
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
            {labCount > 1 ? (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
                {labCount} labs
              </span>
            ) : null}
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
    <DiagnosticsCatalogShell
      activeTab="packages"
      headerActions={
        <PermissionGate category="diagnostics" action="edit">
          <HeaderActionButton label="Add Package" icon={Plus} onClick={openCreate} />
        </PermissionGate>
      }
    >
        <div>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
                placeholder="Search package name..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All providers</option>
                {PROVIDER_FILTER_OPTIONS.map((provider) => (
                  <option key={provider} value={provider}>
                    {diagnosticProviderDisplayLabel(provider)}
                  </option>
                ))}
              </select>
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All genders</option>
                {GENDER_FILTER_OPTIONS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-zinc-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">All status</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {loading ? (
              <div className="py-14 flex justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                keyExtractor={(row) => row.package_group_id ?? row.diagnostic_package_id}
                onView={openView}
                onEdit={openEdit}
                onDuplicate={handleDuplicatePackage}
                onDelete={handleDeletePackage}
                firstColumnClickableView
                pagination={{
                  page,
                  limit: LIST_LIMIT,
                  total,
                  onPageChange: setPage,
                }}
              />
            )}
          </div>
        </div>
    </DiagnosticsCatalogShell>
  );
}
