import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { exportLogsApi, getApiError, type ExportLogItem } from "../../lib/api";

const SEARCH_DEBOUNCE_MS = 300;
const EXPORT_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "participants", label: "Participants" },
  { value: "database_backup", label: "Database backup" },
  { value: "contact_reveal", label: "Contact reveal" },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatRole(role: string): string {
  if (role === "inferior_admin") return "Employee";
  if (role === "organization_manager") return "Organization Manager";
  if (!role) return "—";
  return role.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const SOURCE_KIND_LABELS: Record<string, string> = {
  engagement: "Engagement",
  organization: "Organization",
  camp: "Camp",
  system: "System",
  user: "User",
};

function detailString(details: Record<string, unknown> | null | undefined, key: string): string {
  const value = details?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function detailsSourceKind(details: Record<string, unknown> | null | undefined): string {
  return detailString(details, "source_kind");
}

function detailsSourceId(details: Record<string, unknown> | null | undefined): string {
  const value = details?.["source_id"];
  if (value == null) return "";
  return String(value).trim();
}

export function formatExportLogSource(row: Pick<ExportLogItem, "details"> & {
  source_kind?: string;
  source_id?: string | null;
}): {
  title: string;
  subtitle: string;
} {
  const details = (row.details ?? null) as Record<string, unknown> | null;
  const sourceKind = detailsSourceKind(details) || row.source_kind || "";
  const sourceId = detailsSourceId(details) || (row.source_id ? String(row.source_id) : "");
  const kind = SOURCE_KIND_LABELS[sourceKind] || sourceKind || "Source";
  const name =
    detailString(details, "source_name") ||
    detailString(details, "engagement_name") ||
    detailString(details, "organization_name") ||
    detailString(details, "camp_name");
  const orgName = detailString(details, "organization_name");
  const idLabel = sourceId ? `#${sourceId}` : "";
  if (name && orgName && orgName !== name) {
    return { title: name, subtitle: `${kind} · ${orgName}` };
  }
  if (name && idLabel && name !== idLabel && !name.includes(sourceId || "")) {
    return { title: name, subtitle: `${kind} · ${idLabel}` };
  }
  if (name) {
    return { title: name, subtitle: kind };
  }
  if (idLabel) {
    return { title: idLabel, subtitle: kind };
  }
  return { title: kind, subtitle: "" };
}

export function ExportLogsTab() {
  const [data, setData] = useState<ExportLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exportType, setExportType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, exportType]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exportLogsApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        export_type: exportType || undefined,
      });
      setData(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, exportType]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const columns: Column<ExportLogItem>[] = [
    {
      key: "created_at",
      label: "Time",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "employee_name",
      label: "Employee",
      render: (row) => row.employee_name || "—",
    },
    {
      key: "employee_role",
      label: "Role",
      hideOnMobile: true,
      render: (row) => formatRole(row.employee_role),
    },
    {
      key: "export_type",
      label: "Type",
      hideOnTablet: true,
      render: (row) => row.export_type || "—",
    },
    {
      key: "source",
      label: "Source",
      hideOnTablet: true,
      render: (row) => {
        const source = formatExportLogSource(row);
        return (
          <div className="min-w-0 max-w-[16rem]">
            <div className="truncate font-medium text-zinc-900" title={source.title}>
              {source.title}
            </div>
            {source.subtitle ? (
              <div className="truncate text-xs text-zinc-500" title={source.subtitle}>
                {source.subtitle}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "Reason",
      render: (row) => (
        <span className="line-clamp-2 whitespace-pre-wrap break-words">{row.reason || "—"}</span>
      ),
    },
  ];

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by name, reason, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          className="sm:w-auto px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          {EXPORT_TYPE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(row) => row.export_log_id}
            pagination={{
              page,
              limit,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </div>
    </>
  );
}
