import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Trash2 } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import {
  diagnosticTestGroupsApi,
  getApiError,
  type DiagnosticTestGroupProfileListItem,
} from "../../lib/api";

const LIST_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function DiagnosticTestGroups() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DiagnosticTestGroupProfileListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pendingDeleteRow, setPendingDeleteRow] = useState<DiagnosticTestGroupProfileListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticTestGroupsApi.listGroups({
        page,
        limit: LIST_LIMIT,
        search: debouncedSearch || undefined,
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openView = (row: DiagnosticTestGroupProfileListItem) => {
    navigate(`/diagnostics/test-groups/${row.group_id}`);
  };

  const openEdit = (row: DiagnosticTestGroupProfileListItem) => {
    navigate(`/diagnostics/test-groups/${row.group_id}/edit`);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteRow) return;
    setDeleting(true);
    setError(null);
    try {
      await diagnosticTestGroupsApi.delete(pendingDeleteRow.group_id);
      setPendingDeleteRow(null);
      await fetchGroups();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<DiagnosticTestGroupProfileListItem>[] = [
    {
      key: "group_name",
      label: "Group name",
      render: (row) => {
        const labCount = Object.keys(row.profile_group ?? {}).length;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openView(row);
            }}
            className="inline-flex items-center gap-1.5 font-medium text-zinc-900 hover:underline text-left"
          >
            {row.group_name}
            {labCount > 1 ? (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
                {labCount} labs
              </span>
            ) : null}
          </button>
        );
      },
    },
    {
      key: "test_count",
      label: "Test count",
      render: (row) => row.test_count,
    },
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
  ];

  return (
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
            placeholder="Search test groups..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            keyExtractor={(row) => row.group_id}
            onView={openView}
            onEdit={openEdit}
            onDelete={(row) => setPendingDeleteRow(row)}
            firstColumnClickableView
            mutationCategory="diagnostics"
            mutationTaskKey="tests_groups"
            pagination={{
              page,
              limit: LIST_LIMIT,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      <Modal
        open={pendingDeleteRow != null}
        onClose={() => !deleting && setPendingDeleteRow(null)}
        title="Delete test group variant"
      >
        <p className="text-sm text-zinc-600 mb-4">
          Delete the default lab variant{" "}
          <strong>{pendingDeleteRow?.group_name}</strong>? Other lab variants in this profile stay; the cheapest
          remaining variant becomes the catalog default.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-zinc-300 rounded-lg"
            onClick={() => setPendingDeleteRow(null)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg inline-flex items-center gap-2"
            onClick={() => void confirmDelete()}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
