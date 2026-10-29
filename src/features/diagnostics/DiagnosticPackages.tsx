import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActionButton } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
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

const LIST_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;
const PROVIDER_FILTER_OPTIONS = ["healthians", "Healthians", "orange_health"];
const GENDER_FILTER_OPTIONS = ["male", "female", "both"];
const REORDER_FETCH_LIMIT = 100;

function rowSortKey(row: DiagnosticPackageGroupListItem): number {
  return row.package_group_id ?? row.diagnostic_package_id;
}

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

  const [allGroupRows, setAllGroupRows] = useState<DiagnosticPackageGroupListItem[]>([]);
  const [reordering, setReordering] = useState(false);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<DiagnosticPackageGroupListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const listFilters = useMemo(
    () => ({
      include_inactive: true as const,
      type: "public_package" as const,
      search: debouncedSearch || undefined,
      tag: tagFilter || undefined,
      diagnostic_provider: providerFilter || undefined,
      gender: genderFilter || undefined,
      status: statusFilter || undefined,
    }),
    [debouncedSearch, tagFilter, providerFilter, genderFilter, statusFilter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticPackagesApi.listGroups({
        ...listFilters,
        page,
        limit: LIST_LIMIT,
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
  }, [page, listFilters]);

  const fetchAllForReorder = useCallback(async () => {
    try {
      const res = await diagnosticPackagesApi.listGroups({
        ...listFilters,
        limit: REORDER_FETCH_LIMIT,
      });
      setAllGroupRows(res.data.data ?? []);
    } catch {
      /* optional */
    }
  }, [listFilters]);

  useEffect(() => {
    void fetchAllForReorder();
  }, [fetchAllForReorder]);

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

  const requestDeletePackage = (row: DiagnosticPackageGroupListItem) => {
    setPendingDeleteRow(row);
  };

  const confirmDeletePackage = async () => {
    if (!pendingDeleteRow) return;
    const packageId = pendingDeleteRow.diagnostic_package_id;
    setDeleting(true);
    setError(null);
    try {
      await diagnosticPackagesApi.delete(packageId);
      setPendingDeleteRow(null);
      await fetchPackages();
      await fetchAllForReorder();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const defaultProviderLabelForRow = (row: DiagnosticPackageGroupListItem) =>
    diagnosticProviderDisplayLabel(row.diagnostic_provider);

  const handleReorder = async (newPageOrderKeys: (string | number)[]) => {
    if (reordering || allGroupRows.length === 0) return;
    const full = allGroupRows.length > 0 ? allGroupRows : rows;
    const fullKeys = full.map(rowSortKey);
    const pageKeySet = new Set(rows.map(rowSortKey));
    const pagePositions = fullKeys
      .map((key, index) => ({ key, index }))
      .filter((entry) => pageKeySet.has(entry.key));
    if (pagePositions.length === 0) return;

    const startIndex = pagePositions[0].index;
    const newFullKeys = [...fullKeys];
    newPageOrderKeys.forEach((key, offset) => {
      newFullKeys[startIndex + offset] = Number(key);
    });

    const keyToRow = new Map(full.map((row) => [rowSortKey(row), row]));
    const packageIds = newFullKeys
      .map((key) => keyToRow.get(key)?.diagnostic_package_id)
      .filter((id): id is number => id != null);

    setReordering(true);
    setError(null);
    try {
      await diagnosticPackagesApi.reorder({ package_ids: packageIds });
      const reorderedFull = newFullKeys
        .map((key) => keyToRow.get(key))
        .filter((row): row is DiagnosticPackageGroupListItem => row != null);
      setAllGroupRows(reorderedFull);
      const pageOffset = (page - 1) * LIST_LIMIT;
      setRows(reorderedFull.slice(pageOffset, pageOffset + LIST_LIMIT));
      await fetchPackages();
      await fetchAllForReorder();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setReordering(false);
    }
  };

  const columns: Column<DiagnosticPackageGroupListItem>[] = [
    {
      key: "package_name",
      label: "Package name",
      render: (row) => {
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
            {row.has_unmapped_tests ? (
              <span
                title="Some tests are unmapped"
                aria-label="Some tests are unmapped"
                className="inline-flex text-amber-600"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
              </span>
            ) : null}
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

          {mayEditDiagnostics && total > 0 ? (
            <p className="mb-3 text-xs text-zinc-500">
              Drag rows to reorder the website catalog
              {total > REORDER_FETCH_LIMIT
                ? ` (first ${REORDER_FETCH_LIMIT} of ${total} products in this filter).`
                : total !== allGroupRows.length && allGroupRows.length > 0
                  ? ` (${allGroupRows.length} products in this filter).`
                  : ` (${total} products).`}
            </p>
          ) : null}

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
                onDelete={requestDeletePackage}
                onReorder={mayEditDiagnostics ? handleReorder : undefined}
                mutationTaskKey="packages"
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

          {pendingDeleteRow != null ? (
            <Modal
              open={pendingDeleteRow != null}
              onClose={() => {
                if (!deleting) setPendingDeleteRow(null);
              }}
              title="Delete lab package"
            >
              <p className="text-sm text-zinc-600 mb-4">
                Delete {defaultProviderLabelForRow(pendingDeleteRow)} for &ldquo;{pendingDeleteRow.package_name}
                &rdquo;? This permanently removes this package&apos;s reasons, tags, samples, preparations, filter
                links, and test assignments.
                {Object.keys(pendingDeleteRow.package_group ?? {}).length > 1
                  ? " Other labs in this product will remain; the lowest-price remaining lab becomes the new default."
                  : ""}
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDeletePackage()}
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
                  onClick={() => setPendingDeleteRow(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </Modal>
          ) : null}
        </div>
    </DiagnosticsCatalogShell>
  );
}
