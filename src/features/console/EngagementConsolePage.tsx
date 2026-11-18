import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  Loader2,
  MoreVertical,
  Eye,
  Users,
  ClipboardList,
  AlertTriangle,
  Camera,
  CalendarPlus,
  Ban,
  RefreshCw,
} from "lucide-react";
import { ConsoleLayout } from "../../layouts/ConsoleLayout";
import { Modal } from "../../shared/ui/Modal";
import { PortalMenu } from "../../shared/ui/PortalMenu";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { HomeCollectionBookingModal } from "./HomeCollectionBookingModal";
import { HomeCollectionRescheduleModal } from "./HomeCollectionRescheduleModal";
import { ParticipantQuestionnaireModal } from "./ParticipantQuestionnaireModal";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  consoleApi,
  getApiError,
  getApiErrorDetails,
  type Participant,
  type ConsoleEngagementListItem,
  type ConsoleParticipantBookResponse,
  type ConsoleParticipantFilterFacets,
  type ConsoleParticipantListParams,
} from "../../lib/api";

const CONSOLE_PAGE_SIZE = 10;
const CONSOLE_SEARCH_LIMIT = 25;
import { diagnosticProviderLabel } from "./homeCollectionUi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(p: Participant): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

function formatBool(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function isParticipantBooked(p: Participant): boolean {
  return Boolean(p.booking_id?.trim());
}

function isCollectionDateAfterToday(p: Participant): boolean {
  const d = (p.engagement_date ?? "").trim();
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const coll = new Date(`${d}T00:00:00`);
  if (Number.isNaN(coll.getTime())) return false;
  return coll.getTime() > today.getTime();
}

function applyBookingToParticipant(
  p: Participant,
  result: ConsoleParticipantBookResponse
): Participant {
  return {
    ...p,
    booking_id: result.booking_id ?? p.booking_id,
    barcode: result.barcode ?? p.barcode,
    engagement_date:
      result.engagement_date !== undefined && result.engagement_date !== null
        ? result.engagement_date
        : p.engagement_date,
    slot_start_time:
      result.slot_start_time !== undefined && result.slot_start_time !== null
        ? result.slot_start_time
        : p.slot_start_time,
  };
}

/** Combine engagement_date + slot_start_time into a local Date, or null if incomplete. */
function parseParticipantCollectionAt(p: Participant): Date | null {
  const dateStr = (p.engagement_date ?? "").trim();
  const slotStr = (p.slot_start_time ?? "").trim();
  if (!dateStr || !slotStr) return null;

  const timePart = slotStr.length === 5 ? `${slotStr}:00` : slotStr;
  const parsed = new Date(`${dateStr}T${timePart}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function isCollectionOffByMoreThan15Min(p: Participant, now = new Date()): boolean {
  const scheduled = parseParticipantCollectionAt(p);
  if (!scheduled) return false;
  return Math.abs(now.getTime() - scheduled.getTime()) > FIFTEEN_MIN_MS;
}

// ─── Component ────────────────────────────────────────────────────────────────

type ModalMode =
  | "detail"
  | "book"
  | "book_schedule_confirm"
  | "book_home_collection"
  | "reschedule_home_collection"
  | "cancel_confirm"
  | "cancel"
  | "questionnaires"
  | null;

export function EngagementConsolePage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const { employeeRole } = useAuth();
  const { canEditTask } = usePermissions();
  const mayEditBookings = canEditTask("engagement_console", "bookings");
  const mayEditQuestionnaires = canEditTask("engagement_console", "questionnaires");
  const isAdmin = employeeRole === "admin";
  const isOrgManager = employeeRole === "organization_manager";
  const engId = Number(engagementId);

  const consoleListPath = isAdmin ? "/engagements" : "/engagements/console";
  const consoleListLabel = isAdmin
    ? "Back to Engagements"
    : isOrgManager
      ? "Back to your organization engagements"
      : "Back to your engagements";

  const [engagement, setEngagement] = useState<ConsoleEngagementListItem | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLimit, setListLimit] = useState(CONSOLE_PAGE_SIZE);
  const [filterFacets, setFilterFacets] =
    useState<ConsoleParticipantFilterFacets | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const listReadyRef = useRef(false);
  const skipNextPageFetchRef = useRef(false);
  const prevSearchRef = useRef<string | null>(null);
  const filtersPrimedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"not_running" | "forbidden" | "generic" | null>(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [actionMenuRow, setActionMenuRow] = useState<number | null>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [barcode, setBarcode] = useState("");
  const [syncCollectionToNow, setSyncCollectionToNow] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

  const buildListParams = useCallback(
    (targetPage: number): ConsoleParticipantListParams => {
      const q = search.trim();
      const limit = q ? CONSOLE_SEARCH_LIMIT : CONSOLE_PAGE_SIZE;
      return {
        page: targetPage,
        limit,
        ...(q ? { search: q } : {}),
        ...(dateFilter ? { engagement_date: dateFilter } : {}),
        ...(departmentFilter ? { department: departmentFilter } : {}),
      };
    },
    [search, dateFilter, departmentFilter]
  );

  const fetchParticipantPage = useCallback(
    async (targetPage: number): Promise<Participant[]> => {
      if (!engId || isNaN(engId)) return [];
      setListLoading(true);
      try {
        const res = await consoleApi.listParticipants(
          engId,
          buildListParams(targetPage)
        );
        const parts = res.data.data;
        setParticipants(parts);
        setTotal(res.data.meta.total);
        setPage(res.data.meta.page);
        setListLimit(res.data.meta.limit);
        return parts;
      } finally {
        setListLoading(false);
      }
    },
    [engId, buildListParams]
  );

  const reloadParticipants = useCallback(async (): Promise<Participant[]> => {
    return fetchParticipantPage(page);
  }, [fetchParticipantPage, page]);

  const fetchData = useCallback(async () => {
    if (!engId || isNaN(engId)) return;
    setLoading(true);
    setError(null);
    setErrorKind(null);
    listReadyRef.current = false;
    prevSearchRef.current = null;
    filtersPrimedRef.current = false;
    try {
      const res = await consoleApi.bootstrap(engId, {
        page: 1,
        limit: CONSOLE_PAGE_SIZE,
      });
      setEngagement(res.data.data.engagement);
      setParticipants(res.data.data.participants);
      setTotal(res.data.meta.total);
      setPage(res.data.meta.page);
      setListLimit(res.data.meta.limit);
      setFilterFacets(res.data.data.filter_facets ?? null);
      skipNextPageFetchRef.current = true;
      listReadyRef.current = true;
      prevSearchRef.current = search;
    } catch (err) {
      const details = getApiErrorDetails(err);
      if (details.code === "ENGAGEMENT_NOT_RUNNING") {
        setErrorKind("not_running");
        setError(
          "This engagement is not running. The console is only available while the engagement status is Running."
        );
      } else if (details.status === 403) {
        setErrorKind("forbidden");
        setError(
          isOrgManager
            ? "You must be assigned to this engagement and be the organization's contact person."
            : "You must be an onboarding assistant assigned to this engagement."
        );
      } else {
        setErrorKind("generic");
        setError(details.message);
      }
    } finally {
      setLoading(false);
    }
  }, [engId, isOrgManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!listReadyRef.current) return;
    if (skipNextPageFetchRef.current) {
      skipNextPageFetchRef.current = false;
      return;
    }
    void fetchParticipantPage(page);
  }, [page, fetchParticipantPage]);

  useEffect(() => {
    if (!listReadyRef.current) return;
    if (!filtersPrimedRef.current) {
      filtersPrimedRef.current = true;
      return;
    }
    setPage(1);
    skipNextPageFetchRef.current = true;
    void fetchParticipantPage(1);
  }, [dateFilter, departmentFilter, fetchParticipantPage]);

  useEffect(() => {
    if (!listReadyRef.current) return;
    if (prevSearchRef.current === null) {
      prevSearchRef.current = search;
      return;
    }
    if (prevSearchRef.current === search) return;
    prevSearchRef.current = search;
    const delay = search.trim() ? 300 : 0;
    const handle = window.setTimeout(() => {
      setPage(1);
      skipNextPageFetchRef.current = true;
      void fetchParticipantPage(1);
    }, delay);
    return () => window.clearTimeout(handle);
  }, [search, fetchParticipantPage]);

  const dateOptions = filterFacets?.collection_dates ?? [];
  const departmentOptions = filterFacets?.departments ?? [];

  const showingFrom =
    total === 0 ? 0 : (page - 1) * listLimit + 1;
  const showingTo = Math.min(page * listLimit, total);
  const canGoPrev = page > 1;
  const canGoNext = page * listLimit < total;

  const openDetail = (p: Participant) => {
    setSelectedParticipant(p);
    setModalMode("detail");
    setActionMenuRow(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedParticipant(null);
    setBarcode("");
    setBookingError(null);
    setSyncCollectionToNow(false);
    setCancelRemarks("");
    setCancelError(null);
    setBarcodeScannerOpen(false);
  };

  const openCampBookModal = (syncToNow: boolean, p?: Participant | null) => {
    setSyncCollectionToNow(syncToNow);
    setBarcode(((p ?? selectedParticipant)?.barcode ?? "").trim());
    setBookingError(null);
    setModalMode("book");
  };

  const startCampBookFlow = (p: Participant) => {
    if (isCollectionOffByMoreThan15Min(p)) {
      setModalMode("book_schedule_confirm");
      return;
    }
    openCampBookModal(false, p);
  };

  const openCancelConfirm = () => {
    setCancelRemarks("");
    setCancelError(null);
    setModalMode("cancel_confirm");
  };

  const openCancelRemarksModal = () => {
    setCancelRemarks("");
    setCancelError(null);
    setModalMode("cancel");
  };

  const openQuestionnairesModal = () => {
    setModalMode("questionnaires");
  };

  const isHomeCollection = engagement?.blood_collection_type === "home_collection";

  const openBookModal = () => {
    if (!selectedParticipant) return;
    if (isHomeCollection) {
      setModalMode("book_home_collection");
      return;
    }
    startCampBookFlow(selectedParticipant);
  };

  const isEngagementRunning =
    (engagement?.status ?? "").toLowerCase() === "running";

  const canBookParticipant = (p: Participant | null) =>
    Boolean(mayEditBookings && p && isEngagementRunning && !isParticipantBooked(p));

  const canCancelBooking = (p: Participant | null) =>
    Boolean(mayEditBookings && p && isEngagementRunning && isParticipantBooked(p));

  const canRescheduleParticipant = (p: Participant | null) =>
    Boolean(
      isHomeCollection &&
        mayEditBookings &&
        p &&
        isEngagementRunning &&
        isParticipantBooked(p) &&
        isCollectionDateAfterToday(p)
    );

  const closeActionMenu = () => {
    setActionMenuRow(null);
    actionMenuAnchorRef.current = null;
  };

  const actionMenuParticipant =
    actionMenuRow !== null
      ? participants.find(
          (row) =>
            (row.engagement_participant_id ?? row.user_id) === actionMenuRow
        ) ?? null
      : null;

  const openQuestionnairesFor = (p: Participant) => {
    setSelectedParticipant(p);
    setModalMode("questionnaires");
    closeActionMenu();
  };

  const openBookFor = (p: Participant) => {
    setSelectedParticipant(p);
    closeActionMenu();
    if (isHomeCollection) {
      setModalMode("book_home_collection");
      return;
    }
    startCampBookFlow(p);
  };

  const openCancelFor = (p: Participant) => {
    setSelectedParticipant(p);
    setCancelRemarks("");
    setCancelError(null);
    setModalMode("cancel_confirm");
    closeActionMenu();
  };

  const openRescheduleFor = (p: Participant) => {
    setSelectedParticipant(p);
    setModalMode("reschedule_home_collection");
    closeActionMenu();
  };

  const handleCreateBooking = async () => {
    if (!selectedParticipant || !engId) return;
    const trimmed = barcode.trim();
    if (!trimmed) {
      setBookingError("Barcode is required.");
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    setPageNotice(null);
    const userId = selectedParticipant.user_id;
    try {
      const res = await consoleApi.bookParticipant(engId, userId, {
        barcode: trimmed,
        ...(syncCollectionToNow ? { sync_collection_to_now: true } : {}),
      });
      const result = res.data.data;
      const bookingCreated =
        result.booking_created !== false &&
        Boolean((result.booking_id ?? "").trim());

      if (!bookingCreated && result.internal_failure === true) {
        const notice =
          (result.message ?? "").trim() ||
          "Barcode collected. You can proceed with the next booking.";
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === userId
              ? { ...p, barcode: result.barcode ?? trimmed }
              : p
          )
        );
        setSelectedParticipant((prev) =>
          prev ? { ...prev, barcode: result.barcode ?? trimmed } : prev
        );
        setBarcode("");
        setSyncCollectionToNow(false);
        setModalMode(null);
        setPageNotice(notice);
        setSelectedParticipant(null);
        void reloadParticipants();
        return;
      }

      if (!bookingCreated) {
        setBookingError(
          (result.message ?? "").trim() || "Booking could not be created."
        );
        return;
      }

      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === userId ? applyBookingToParticipant(p, result) : p
        )
      );
      setSelectedParticipant((prev) =>
        prev ? applyBookingToParticipant(prev, result) : prev
      );
      setBarcode("");
      setSyncCollectionToNow(false);
      setModalMode("detail");

      void reloadParticipants().then((parts) => {
        const updated = parts.find((p) => p.user_id === userId);
        if (updated) setSelectedParticipant(updated);
      });
    } catch (err) {
      const details = getApiErrorDetails(err);
      if (details.barcode_saved) {
        const saved = details.barcode ?? trimmed;
        setParticipants((prev) =>
          prev.map((p) => (p.user_id === userId ? { ...p, barcode: saved } : p))
        );
        setSelectedParticipant((prev) =>
          prev ? { ...prev, barcode: saved } : prev
        );
        void reloadParticipants();
      }
      setBookingError(details.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedParticipant || !engId) return;
    const trimmed = cancelRemarks.trim();
    if (!trimmed) {
      setCancelError("Remarks are required.");
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    const userId = selectedParticipant.user_id;
    try {
      await consoleApi.cancelParticipantBooking(engId, userId, trimmed);
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === userId
            ? { ...p, booking_id: null, barcode: null }
            : p
        )
      );
      setSelectedParticipant((prev) =>
        prev ? { ...prev, booking_id: null, barcode: null } : prev
      );
      setCancelRemarks("");
      setModalMode("detail");

      void reloadParticipants().then((parts) => {
        const updated = parts.find((p) => p.user_id === userId);
        if (updated) setSelectedParticipant(updated);
      });
    } catch (err) {
      setCancelError(getApiError(err));
    } finally {
      setCancelLoading(false);
    }
  };

  if (!engId || isNaN(engId)) {
    return (
      <ConsoleLayout
        backHref={isAdmin ? "/engagements" : isOrgManager ? "/organisations" : undefined}
        backLabel={
          isAdmin ? "Back to Engagements" : isOrgManager ? "Back to Organisations" : undefined
        }
      >
        <div className="flex items-center justify-center h-64 text-zinc-500">
          Invalid engagement.
        </div>
      </ConsoleLayout>
    );
  }

  const isNotRunning =
    isAdmin &&
    engagement &&
    (engagement.status ?? "").toLowerCase() !== "running";

  return (
    <ConsoleLayout
      engagementName={engagement?.engagement_name ?? undefined}
      backHref={isAdmin ? "/engagements" : "/engagements/console"}
      backLabel={
        isAdmin
          ? "Back to Engagements"
          : isOrgManager
            ? "Your organization engagements"
            : "Your engagements"
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3 px-4">
          <p className="text-red-600 max-w-md">{error}</p>
          {(errorKind === "not_running" || errorKind === "forbidden") && (
            <Link
              to={consoleListPath}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 underline"
            >
              {consoleListLabel}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isNotRunning && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              This engagement is not running — read-only view.
            </div>
          )}
          {pageNotice && (
            <div
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start justify-between gap-3"
              role="status"
            >
              <span>{pageNotice}</span>
              <button
                type="button"
                onClick={() => setPageNotice(null)}
                className="text-emerald-800 text-xs font-medium hover:underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <Users className="w-4 h-4" />
              <span>
                {search.trim()
                  ? `${total} match${total !== 1 ? "es" : ""}`
                  : `${total} participant${total !== 1 ? "s" : ""}`}
                {total > 0 &&
                  !search.trim() &&
                  ` · showing ${showingFrom}–${showingTo}`}
              </span>
              {listLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              )}
              {isHomeCollection && engagement?.diagnostic_provider && (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                  Home collection · {diagnosticProviderLabel(engagement.diagnostic_provider)}
                </span>
              )}
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                />
              </div>
              {dateOptions.length > 1 && (
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">All dates</option>
                  {dateOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              {departmentOptions.length > 1 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">All departments</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-zinc-600">
                    Name
                  </th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-zinc-600">
                    Phone
                  </th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-zinc-600 hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 hidden xl:table-cell">
                    Age
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 hidden lg:table-cell">
                    Collection Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 hidden lg:table-cell">
                    Slot Time
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600 hidden md:table-cell">
                    Department
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-medium text-zinc-600 w-10 sm:w-12">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {participants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-zinc-400"
                    >
                      No participants found.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr
                      key={
                        p.engagement_participant_id ??
                        `${p.user_id}-${p.engagement_id}`
                      }
                      onClick={() => openDetail(p)}
                      className="hover:bg-zinc-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-3 font-medium text-zinc-900 truncate">
                        {fullName(p)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-zinc-600 truncate">
                        {p.phone ?? "—"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-zinc-600 truncate hidden sm:table-cell">
                        {p.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden xl:table-cell">
                        {p.age ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        {p.engagement_date ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">
                        {p.slot_start_time ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 truncate hidden md:table-cell">
                        {p.participant_department ?? "—"}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            ref={
                              actionMenuRow ===
                              (p.engagement_participant_id ?? p.user_id)
                                ? actionMenuAnchorRef
                                : undefined
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const rowId =
                                p.engagement_participant_id ?? p.user_id;
                              if (actionMenuRow === rowId) {
                                setActionMenuRow(null);
                                actionMenuAnchorRef.current = null;
                              } else {
                                actionMenuAnchorRef.current = e.currentTarget;
                                setActionMenuRow(rowId);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="Actions"
                            aria-haspopup="menu"
                            aria-expanded={
                              actionMenuRow ===
                              (p.engagement_participant_id ?? p.user_id)
                            }
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > listLimit && !search.trim() && (
            <div className="flex items-center justify-between gap-3 text-sm text-zinc-600">
              <span>
                Page {page} · {showingFrom}–{showingTo} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canGoPrev || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canGoNext || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          <PortalMenu
            open={actionMenuRow !== null}
            anchorRef={actionMenuAnchorRef}
            onClose={closeActionMenu}
            width={180}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (actionMenuParticipant) openDetail(actionMenuParticipant);
                closeActionMenu();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (actionMenuParticipant) {
                  openQuestionnairesFor(actionMenuParticipant);
                }
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <ClipboardList className="w-4 h-4" />
              Questionnaires
            </button>
            {canBookParticipant(actionMenuParticipant) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (actionMenuParticipant) {
                    openBookFor(actionMenuParticipant);
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <CalendarPlus className="w-4 h-4" />
                Book
              </button>
            )}
            {canRescheduleParticipant(actionMenuParticipant) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (actionMenuParticipant) {
                    openRescheduleFor(actionMenuParticipant);
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
            )}
            {canCancelBooking(actionMenuParticipant) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (actionMenuParticipant) {
                    openCancelFor(actionMenuParticipant);
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" />
                Cancel booking
              </button>
            )}
          </PortalMenu>
        </div>
      )}

      {/* Participant modals */}
      <Modal
        open={modalMode === "detail"}
        onClose={closeModal}
        title="Participant Details"
        maxWidthClassName="max-w-lg"
      >
        {selectedParticipant && (
          <div className="space-y-4">
            <ParticipantDetail participant={selectedParticipant} />
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={openQuestionnairesModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <ClipboardList className="w-4 h-4" />
                Questionnaires
              </button>
              {canBookParticipant(selectedParticipant) && (
                <button
                  type="button"
                  onClick={openBookModal}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
                >
                  Book
                </button>
              )}
              {canRescheduleParticipant(selectedParticipant) && (
                <button
                  type="button"
                  onClick={() => openRescheduleFor(selectedParticipant)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reschedule
                </button>
              )}
              {canCancelBooking(selectedParticipant) && (
                <button
                  type="button"
                  onClick={openCancelConfirm}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                >
                  Cancel booking
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalMode === "cancel_confirm"}
        onClose={closeModal}
        title="Cancel Booking"
        maxWidthClassName="max-w-md"
      >
        {selectedParticipant && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                Are you sure you want to cancel the Healthians booking for{" "}
                <span className="font-medium">{fullName(selectedParticipant)}</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                No, keep booking
              </button>
              <button
                type="button"
                onClick={openCancelRemarksModal}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Yes, cancel booking
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalMode === "cancel"}
        onClose={closeModal}
        title="Cancel Booking"
        maxWidthClassName="max-w-md"
      >
        {selectedParticipant && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Cancel Healthians booking for {fullName(selectedParticipant)}.
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Remarks
              </label>
              <textarea
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Reason for cancellation"
              />
            </div>
            {cancelError && (
              <p className="text-sm text-red-600">{cancelError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalMode === "book_schedule_confirm"}
        onClose={closeModal}
        title="Confirm Collection Time"
        maxWidthClassName="max-w-md"
      >
        {selectedParticipant && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                The collection was at{" "}
                <span className="font-medium">
                  {selectedParticipant.engagement_date ?? "—"}{" "}
                  {selectedParticipant.slot_start_time ?? "—"}
                </span>
                . Want to book now?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => openCampBookModal(true)}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
              >
                Yes
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalMode === "book"}
        onClose={closeModal}
        title="Create Booking"
        maxWidthClassName="max-w-md"
      >
        {selectedParticipant && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Create a Healthians booking for{" "}
              <span className="font-medium text-zinc-900">{fullName(selectedParticipant)}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Barcode</label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter barcode"
                  className="w-full border border-zinc-300 rounded-lg pl-3 pr-11 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setBarcodeScannerOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  aria-label="Scan barcode with camera"
                  title="Scan barcode"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateBooking()}
                disabled={bookingLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                {bookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Booking
              </button>
            </div>
          </div>
        )}
      </Modal>

      <BarcodeScannerModal
        open={barcodeScannerOpen}
        onClose={() => setBarcodeScannerOpen(false)}
        onScan={(value) => {
          setBarcode(value);
          setBookingError(null);
        }}
      />

      {selectedParticipant && (
        <HomeCollectionBookingModal
          key={`book-hc-${selectedParticipant.user_id}-${modalMode}`}
          open={modalMode === "book_home_collection"}
          onClose={closeModal}
          engagementId={engId}
          participant={selectedParticipant}
          diagnosticProvider={engagement?.diagnostic_provider}
          onBooked={(bid) => {
            const userId = selectedParticipant.user_id;
            setParticipants((prev) =>
              prev.map((p) =>
                p.user_id === userId ? { ...p, booking_id: bid } : p
              )
            );
            setSelectedParticipant((prev) =>
              prev ? { ...prev, booking_id: bid } : prev
            );
            void reloadParticipants().then((parts) => {
              const updated = parts.find((p) => p.user_id === userId);
              if (updated) setSelectedParticipant(updated);
            });
          }}
        />
      )}

      {selectedParticipant && (
        <HomeCollectionRescheduleModal
          key={`reschedule-${selectedParticipant.user_id}-${selectedParticipant.booking_id ?? "none"}-${modalMode}`}
          open={modalMode === "reschedule_home_collection"}
          onClose={closeModal}
          engagementId={engId}
          participant={selectedParticipant}
          diagnosticProvider={engagement?.diagnostic_provider}
          onRescheduled={(result) => {
            const userId = selectedParticipant.user_id;
            setParticipants((prev) =>
              prev.map((p) =>
                p.user_id === userId
                  ? {
                      ...p,
                      booking_id: result.booking_id,
                      engagement_date: result.engagement_date,
                      slot_start_time: result.slot_start_time,
                    }
                  : p
              )
            );
            setSelectedParticipant((prev) =>
              prev
                ? {
                    ...prev,
                    booking_id: result.booking_id,
                    engagement_date: result.engagement_date,
                    slot_start_time: result.slot_start_time,
                  }
                : prev
            );
            void reloadParticipants().then((parts) => {
              const updated = parts.find((p) => p.user_id === userId);
              if (updated) setSelectedParticipant(updated);
            });
          }}
        />
      )}

      {selectedParticipant && (
        <ParticipantQuestionnaireModal
          open={modalMode === "questionnaires"}
          onClose={closeModal}
          engagementId={engId}
          participant={selectedParticipant}
          isEngagementRunning={isEngagementRunning && mayEditQuestionnaires}
        />
      )}
    </ConsoleLayout>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function ParticipantDetail({ participant: p }: { participant: Participant }) {
  const field = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm text-zinc-900">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {field("Name", fullName(p))}
      {field("Phone", p.phone)}
      {field("Email", p.email)}
      {field("Age", p.age)}
      {field("Blood Collection Date", p.engagement_date)}
      {field("Slot Time", p.slot_start_time)}
      {field("Department", p.participant_department)}
      {field("Employee ID", p.participants_employee_id)}
      {field("Blood Group", p.participant_blood_group)}
      {p.consultations &&
        Object.entries(p.consultations).map(([key, val]) => {
          const label = `${key.charAt(0).toUpperCase() + key.slice(1)} Consultation`;
          if (val == null) return field(label, "—");
          if (typeof val === "boolean") return field(label, formatBool(val));
          const want = formatBool(val.want);
          const bits = [
            `Want: ${want}`,
            val.date ? `Date: ${val.date}` : null,
            val.slot ? `Slot: ${val.slot}` : null,
            val.expert_id != null ? `Expert: #${val.expert_id}` : null,
            `Done: ${formatBool(Boolean(val.done))}`,
          ].filter(Boolean);
          return field(label, bits.join(" · "));
        })}
      {field("Barcode", p.barcode)}
      {field("Booking ID", p.booking_id)}
      {field("Booked by user ID", p.booked_by_user_id)}
      {(p.blood_bookings?.length ?? 0) > 0 && (
        <div className="sm:col-span-2 flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            All collections
          </span>
          <ul className="space-y-2">
            {p.blood_bookings!.map((b) => (
              <li
                key={b.id ?? b.booking_id}
                className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50"
              >
                <span className="font-medium">
                  {b.relation === "redraw"
                    ? "Redraw (new test)"
                    : b.relation === "resample"
                      ? "Resample (same report)"
                      : b.relation === "reschedule"
                        ? "Rescheduled"
                        : "Primary draw"}
                </span>
                <span className="text-zinc-500"> · {b.status ?? "active"}</span>
                <div className="font-mono text-zinc-800 mt-0.5">{b.booking_id || "No booking ID"}</div>
                <div className="text-zinc-600">
                  {[b.collection_date, b.collection_time, b.collection_cabin].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
