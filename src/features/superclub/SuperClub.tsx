import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import { PageHeaderActions } from "../../layouts/PageHeaderActions";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  superclubApi,
  type SuperClubPlaylistRow,
  type SuperClubSportCatalogItem,
  getApiError,
} from "../../lib/api";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_VISIBLE_SPORT_CHIPS = 4;

function filterChipClass(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"
  }`;
}

function fullName(row: SuperClubPlaylistRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function sportLabel(
  sportId: string,
  catalog: SuperClubSportCatalogItem[],
  counts: Record<string, number>
): string {
  const fromCatalog = catalog.find((item) => item.id === sportId)?.label;
  if (fromCatalog) {
    const count = counts[sportId];
    return count != null ? `${fromCatalog} (${count})` : fromCatalog;
  }
  const count = counts[sportId];
  const base = sportId.replace(/_/g, " ");
  return count != null ? `${base} (${count})` : base;
}

function topSportEntry(
  catalog: SuperClubSportCatalogItem[],
  counts: Record<string, number>
): { label: string; count: number } | null {
  let best: { id: string; count: number } | null = null;
  for (const [id, count] of Object.entries(counts)) {
    if (id === "other") continue;
    if (!best || count > best.count) {
      best = { id, count };
    }
  }
  if (!best) return null;
  const label = catalog.find((item) => item.id === best!.id)?.label ?? best.id;
  return { label, count: best.count };
}

export function SuperClub() {
  const { canView } = usePermissions();
  const mayOpenUsers = canView("users");

  const [data, setData] = useState<SuperClubPlaylistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sportFilters, setSportFilters] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState({
    playlists_submitted: 0,
    other_count: 0,
    avg_sports: 0,
    sport_catalog: [] as SuperClubSportCatalogItem[],
    sport_counts: {} as Record<string, number>,
  });

  const [detailRow, setDetailRow] = useState<SuperClubPlaylistRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superclubApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        sport_id: sportFilters.length > 0 ? sportFilters : undefined,
        sort_by: sortKey,
        sort_dir: sortDir,
      });
      setData(res.data.data);
      setTotal(res.data.meta.total);
      setMeta({
        playlists_submitted: res.data.meta.playlists_submitted,
        other_count: res.data.meta.other_count,
        avg_sports: res.data.meta.avg_sports,
        sport_catalog: res.data.meta.sport_catalog ?? [],
        sport_counts: res.data.meta.sport_counts ?? {},
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sportFilters, sortKey, sortDir]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sportFilters]);

  const catalog = meta.sport_catalog;
  const sportCounts = meta.sport_counts;
  const topSport = useMemo(() => topSportEntry(catalog, sportCounts), [catalog, sportCounts]);

  const chipSportIds = useMemo(() => {
    const known = catalog.map((item) => item.id);
    const extras = Object.keys(sportCounts).filter(
      (id) => id !== "other" && !known.includes(id)
    );
    return [...known, ...extras.sort()];
  }, [catalog, sportCounts]);

  const toggleSportFilter = (sportId: string) => {
    setSportFilters((prev) =>
      prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]
    );
  };

  const labelForSportId = useCallback(
    (sportId: string) => catalog.find((item) => item.id === sportId)?.label ?? sportId,
    [catalog]
  );

  const columns: Column<SuperClubPlaylistRow>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900">{fullName(row)}</span>
          <span className="text-xs text-zinc-500">{row.phone || "—"}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      hideOnMobile: true,
      render: (row) => <span className="text-zinc-600">{row.email || "—"}</span>,
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      hideOnTablet: true,
      render: (row) => <span className="text-zinc-600">{row.city || "—"}</span>,
    },
    {
      key: "sports",
      label: "Sports",
      render: (row) => {
        const ids = row.sports_playlists?.sportIds ?? [];
        const visible = ids.slice(0, MAX_VISIBLE_SPORT_CHIPS);
        const rest = ids.length - visible.length;
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {visible.map((id) => {
              const active = sportFilters.includes(id);
              return (
                <span
                  key={id}
                  className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {labelForSportId(id)}
                </span>
              );
            })}
            {rest > 0 && (
              <span className="text-xs text-zinc-500 self-center">+{rest}</span>
            )}
            {ids.length === 0 && row.sports_playlists?.otherSelected && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800">
                Other
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "other",
      label: "Other",
      hideOnTablet: true,
      render: (row) => {
        const note = (row.sports_playlists?.otherNote ?? "").trim();
        if (!note) return <span className="text-zinc-400">—</span>;
        return <span className="text-zinc-600 text-sm line-clamp-2">{note}</span>;
      },
    },
    {
      key: "updated_at",
      label: "Submitted",
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <span className="text-zinc-600 text-sm">{formatDate(row.playlist_updated_at)}</span>
      ),
    },
  ];

  const emptyMessage =
    meta.playlists_submitted === 0 && !debouncedSearch && sportFilters.length === 0
      ? "No sports playlists yet. Choices appear here when users complete Super Club early access."
      : sportFilters.length === 1
        ? `No users match ${labelForSportId(sportFilters[0])}${sportFilters[0] === "other" ? "" : ""}.`
        : "No users match the current filters.";

  return (
    <div>
      <PageHeaderActions>
        <p className="text-sm text-zinc-500 hidden sm:block">
          Super Club early-access sports playlists
        </p>
      </PageHeaderActions>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Playlists</p>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{meta.playlists_submitted}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Top sport</p>
          <p className="text-lg font-semibold text-zinc-900 mt-1 truncate">
            {topSport ? `${topSport.label} (${topSport.count})` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Other write-ins</p>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{meta.other_count}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg sports / playlist</p>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{meta.avg_sports}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSportFilters([])}
          className={filterChipClass(sportFilters.length === 0)}
        >
          All
          {meta.playlists_submitted > 0 ? ` (${meta.playlists_submitted})` : ""}
        </button>
        {chipSportIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => toggleSportFilter(id)}
            className={filterChipClass(sportFilters.includes(id))}
          >
            {sportLabel(id, catalog, sportCounts)}
          </button>
        ))}
        {(sportCounts.other ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => toggleSportFilter("other")}
            className={filterChipClass(sportFilters.includes("other"))}
          >
            Other ({sportCounts.other})
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading playlists…
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 px-6 text-center text-sm text-zinc-500">{emptyMessage}</div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(row) => row.user_id}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key) => {
              if (sortKey === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortKey(key);
                setSortDir("desc");
              }
            }}
            onView={(row) => setDetailRow(row)}
            firstColumnClickableView
            manageActionPermissions={false}
            pagination={{
              page,
              limit,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      <Modal
        open={detailRow != null}
        onClose={() => setDetailRow(null)}
        title="Sports playlist"
      >
        {detailRow && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-zinc-900 text-base">{fullName(detailRow)}</p>
              <p className="text-zinc-500">{detailRow.phone}</p>
              {detailRow.email && <p className="text-zinc-500">{detailRow.email}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Sports</p>
              <div className="flex flex-wrap gap-1.5">
                {(detailRow.sports_playlists?.sportIds ?? []).map((id) => (
                  <span
                    key={id}
                    className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800"
                  >
                    {labelForSportId(id)}
                  </span>
                ))}
                {detailRow.sports_playlists?.otherSelected && (
                  <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900">
                    Other
                  </span>
                )}
              </div>
            </div>
            {(detailRow.sports_playlists?.otherNote ?? "").trim() && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Other note</p>
                <p className="text-zinc-700">{detailRow.sports_playlists.otherNote}</p>
              </div>
            )}
            <p className="text-zinc-500 text-xs">
              Submitted {formatDate(detailRow.playlist_updated_at)}
            </p>
            {mayOpenUsers && (
              <Link
                to="/users"
                className="inline-flex text-sm font-medium text-zinc-900 underline underline-offset-2"
                onClick={() => setDetailRow(null)}
              >
                Open in Users
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
