import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import {
  diagnosticTestGroupsApi,
  getApiError,
  type DiagnosticTestGroupStandalone,
} from "../../lib/api";

const LIST_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function DiagnosticTestGroups() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DiagnosticTestGroupStandalone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticTestGroupsApi.list({
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

  const openView = (row: DiagnosticTestGroupStandalone) => {
    navigate(`/diagnostics/test-groups/${row.group_id}`);
  };

  const openEdit = (row: DiagnosticTestGroupStandalone) => {
    navigate(`/diagnostics/test-groups/${row.group_id}/edit`);
  };

  const handleDelete = async (row: DiagnosticTestGroupStandalone) => {
    if (!window.confirm("Deleting this group will unassign all its tests. Continue?")) return;
    try {
      await diagnosticTestGroupsApi.delete(row.group_id);
      await fetchGroups();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<DiagnosticTestGroupStandalone>[] = [
    {
      key: "group_name",
      label: "Group name",
      render: (row) => (
        <div>
          <span className="font-medium text-zinc-900">{row.group_name}</span>
          <p className="text-xs text-zinc-500">{row.group_key}</p>
        </div>
      ),
    },
    {
      key: "group_key",
      label: "Group key",
      render: (row) => row.group_key,
      hideOnMobile: true,
    },
    {
      key: "test_count",
      label: "Test count",
      render: (row) => row.test_count,
    },
    {
      key: "display_order",
      label: "Order",
      render: (row) => row.display_order ?? "—",
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
            onDelete={handleDelete}
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
    </div>
  );
}
