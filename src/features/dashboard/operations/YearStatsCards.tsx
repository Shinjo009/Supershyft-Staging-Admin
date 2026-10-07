import { CalendarCheck, Droplets, Stethoscope, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../../contexts/PermissionContext";
import {
  dashboardApi,
  getApiError,
  usersApi,
  type DashboardYearStats,
  type UserListItem,
} from "../../../lib/api";
import { Modal } from "../../../shared/ui/Modal";
import { OperationsTable, StatusPill, TruncateText, type OperationsColumn } from "./OperationsTable";
import type { OverviewUsersStats } from "./DashboardOverview";
import type { EngagementBuckets, SectionState } from "./operationsTypes";

const CARD =
  "bg-white rounded-xl border border-zinc-200 px-3 py-2.5 flex flex-col justify-between gap-1.5 min-h-0";

const USERS_PAGE_SIZE = 25;

function formatExpertType(value: string): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function YearSelect({
  year,
  years,
  onChange,
  disabled,
}: {
  year: number;
  years: number[];
  onChange: (year: number) => void;
  disabled?: boolean;
}) {
  const options = years.length > 0 ? years : [year];
  return (
    <select
      value={year}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className="text-[11px] font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
      aria-label="Select year"
    >
      {options.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function UsersViewAllModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setRows([]);
      setTotal(0);
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search, open]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void usersApi
      .list({
        page,
        limit: USERS_PAGE_SIZE,
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.data ?? []);
        setTotal(res.data.meta.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err));
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * USERS_PAGE_SIZE + 1;
  const to = Math.min(safePage * USERS_PAGE_SIZE, total);

  const columns: OperationsColumn<UserListItem>[] = [
    {
      key: "name",
      label: "Name",
      className: "w-[28%]",
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
        return <TruncateText>{name || `User #${row.user_id}`}</TruncateText>;
      },
    },
    {
      key: "phone",
      label: "Phone",
      className: "w-[20%]",
      render: (row) => <TruncateText>{row.phone || "—"}</TruncateText>,
    },
    {
      key: "email",
      label: "Email",
      className: "w-[28%]",
      render: (row) => <TruncateText>{row.email || "—"}</TruncateText>,
    },
    {
      key: "status",
      label: "Status",
      className: "w-[14%]",
      render: (row) => {
        const status = (row.status || "—").toLowerCase();
        const tone = status === "active" ? "emerald" : status === "inactive" ? "zinc" : "amber";
        return <StatusPill label={row.status || "—"} tone={tone} />;
      },
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title={`All users (${total.toLocaleString()})`} maxWidthClassName="max-w-4xl">
      <div className="flex flex-col h-[70vh] min-h-[70vh]">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, or email…"
            className="w-full sm:max-w-sm px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-500 sm:ml-auto">
            {total === 0 ? `0 users` : `${from}–${to} of ${total.toLocaleString()} users`}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-auto border border-zinc-100 rounded-lg">
          {error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="p-4 text-sm text-zinc-500">Loading users…</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No matching users.</p>
          ) : (
            <OperationsTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.user_id}
              onRowClick={(row) => {
                onClose();
                navigate(`/users/${row.user_id}/journey`);
              }}
            />
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            disabled={safePage <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 text-zinc-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500 tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 text-zinc-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function YearStatsCards({
  users,
  engagements,
  showEngagements = false,
  onViewAllEngagements,
  initialYearStats = null,
}: {
  users: OverviewUsersStats;
  engagements?: SectionState<EngagementBuckets>;
  showEngagements?: boolean;
  onViewAllEngagements?: () => void;
  initialYearStats?: DashboardYearStats | null;
}) {
  const navigate = useNavigate();
  const { canView } = usePermissions();
  const showUsers = users.show;
  const showBlood = canView("engagements");
  const showConsultations = canView("experts");
  const engState = engagements ?? { status: "idle" as const };
  const engLoading = engState.status === "loading";
  const engError = engState.status === "error" ? engState.message : null;
  const engReady = engState.status === "ready";
  const todayCount = engReady ? engState.data.runningToday.length : 0;
  const weekCount = engReady ? engState.data.runningThisWeek.length : 0;

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [bloodYear, setBloodYear] = useState(currentYear);
  const [consultationYear, setConsultationYear] = useState(currentYear);
  const [bloodStats, setBloodStats] = useState<DashboardYearStats | null>(null);
  const [consultationStats, setConsultationStats] = useState<DashboardYearStats | null>(null);
  const [bloodLoading, setBloodLoading] = useState(showBlood);
  const [consultationLoading, setConsultationLoading] = useState(showConsultations);
  const [bloodError, setBloodError] = useState<string | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  const fetchBloodStats = useCallback(async () => {
    if (!showBlood) {
      setBloodStats(null);
      setBloodLoading(false);
      setBloodError(null);
      return;
    }
    if (initialYearStats && bloodYear === initialYearStats.year) {
      setBloodStats(initialYearStats);
      if (showConsultations && bloodYear === consultationYear) {
        setConsultationStats(initialYearStats);
        setConsultationLoading(false);
        setConsultationError(null);
      }
      setBloodLoading(false);
      setBloodError(null);
      return;
    }
    setBloodLoading(true);
    setBloodError(null);
    try {
      const res = await dashboardApi.yearStats(bloodYear);
      const payload = res.data.data;
      setBloodStats(payload);
      if (showConsultations && bloodYear === consultationYear) {
        setConsultationStats(payload);
        setConsultationLoading(false);
        setConsultationError(null);
      }
    } catch (err) {
      setBloodError(getApiError(err));
      setBloodStats(null);
    } finally {
      setBloodLoading(false);
    }
  }, [showBlood, bloodYear, showConsultations, consultationYear, initialYearStats]);

  const fetchConsultationStats = useCallback(async () => {
    if (!showConsultations) {
      setConsultationStats(null);
      setConsultationLoading(false);
      setConsultationError(null);
      return;
    }
    if (bloodYear === consultationYear) {
      return;
    }
    setConsultationLoading(true);
    setConsultationError(null);
    try {
      const res = await dashboardApi.yearStats(consultationYear);
      setConsultationStats(res.data.data);
    } catch (err) {
      setConsultationError(getApiError(err));
      setConsultationStats(null);
    } finally {
      setConsultationLoading(false);
    }
  }, [showConsultations, consultationYear, bloodYear]);

  useEffect(() => {
    void fetchBloodStats();
  }, [fetchBloodStats]);

  useEffect(() => {
    void fetchConsultationStats();
  }, [fetchConsultationStats]);

  const bloodYears = bloodStats?.available_years?.length
    ? bloodStats.available_years
    : [currentYear];
  const consultationYears = consultationStats?.available_years?.length
    ? consultationStats.available_years
    : [currentYear];

  if (!showUsers && !showBlood && !showConsultations && !showEngagements) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {showUsers ? (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                  <UserRound className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-semibold text-zinc-900 truncate">Total users</h2>
              </div>
              <button
                type="button"
                onClick={() => setUsersModalOpen(true)}
                disabled={users.loading || Boolean(users.error)}
                className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 disabled:text-zinc-300 disabled:cursor-not-allowed"
              >
                View all
              </button>
            </div>
            {users.error ? (
              <p className="text-xs text-red-600">{users.error}</p>
            ) : users.loading ? (
              <div className="h-7 w-20 bg-zinc-100 rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-xl font-semibold text-zinc-900 tabular-nums tracking-tight leading-none">
                  {(users.total ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1 tabular-nums">
                  {(users.active ?? 0).toLocaleString()} active
                </p>
              </div>
            )}
          </div>
        ) : null}

        {showBlood ? (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-rose-50 text-rose-700 shrink-0">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-semibold text-zinc-900 truncate">Blood collection</h2>
              </div>
              <YearSelect
                year={bloodYear}
                years={bloodYears}
                onChange={setBloodYear}
                disabled={bloodLoading}
              />
            </div>
            {bloodError ? (
              <p className="text-xs text-red-600">{bloodError}</p>
            ) : bloodLoading ? (
              <div className="h-7 w-16 bg-zinc-100 rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-xl font-semibold text-zinc-900 tabular-nums tracking-tight leading-none">
                  {(bloodStats?.blood_collection_total ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">in {bloodYear}</p>
              </div>
            )}
          </div>
        ) : null}

        {showConsultations ? (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-sky-50 text-sky-700 shrink-0">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-semibold text-zinc-900 truncate">Consultations</h2>
              </div>
              <YearSelect
                year={consultationYear}
                years={consultationYears}
                onChange={setConsultationYear}
                disabled={consultationLoading}
              />
            </div>
            {consultationError ? (
              <p className="text-xs text-red-600">{consultationError}</p>
            ) : consultationLoading ? (
              <div className="h-7 w-16 bg-zinc-100 rounded animate-pulse" />
            ) : (
              <div>
                <p className="text-xl font-semibold text-zinc-900 tabular-nums tracking-tight leading-none">
                  {(consultationStats?.consultations_total ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                  {(consultationStats?.consultations_by_expert_type?.length ?? 0) > 0
                    ? consultationStats!.consultations_by_expert_type
                        .slice(0, 2)
                        .map((item) => `${formatExpertType(item.expert_type)} ${item.count}`)
                        .join(" · ")
                    : `in ${consultationYear}`}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {showEngagements ? (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-semibold text-zinc-900 truncate">Engagements</h2>
              </div>
              <button
                type="button"
                onClick={() => (onViewAllEngagements ? onViewAllEngagements() : navigate("/engagements"))}
                disabled={engLoading || Boolean(engError)}
                className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 disabled:text-zinc-300 disabled:cursor-not-allowed"
              >
                View all
              </button>
            </div>
            {engError ? (
              <p className="text-xs text-red-600">{engError}</p>
            ) : engLoading ? (
              <div className="h-7 w-24 bg-zinc-100 rounded animate-pulse" />
            ) : (
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-xl font-semibold text-zinc-900 tabular-nums leading-none">
                    {todayCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">today</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-zinc-900 tabular-nums leading-none">
                    {weekCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">this week</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {showUsers ? (
        <UsersViewAllModal open={usersModalOpen} onClose={() => setUsersModalOpen(false)} />
      ) : null}
    </>
  );
}
