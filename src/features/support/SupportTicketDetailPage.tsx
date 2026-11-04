import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import {
  getApiError,
  participantJourneyApi,
  supportApi,
  usersApi,
  type SupportTicket,
  type SupportTicketStatus,
  type UserDetail,
} from "../../lib/api";

function parseTicketId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPillClass(status: SupportTicketStatus) {
  if (status === "open") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function userDisplayName(user: UserDetail | null) {
  if (!user) return "—";
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return `User #${user.user_id}`;
}

export function SupportTicketDetailPage() {
  const { ticketId: ticketIdParam } = useParams<{ ticketId: string }>();
  const ticketId = parseTicketId(ticketIdParam);
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const mayEditSupport = canEdit("support");

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<
    { ticket_id: number; status: string; query_text: string; created_at: string }[]
  >([]);
  const [engagementCount, setEngagementCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await supportApi.getTicket(ticketId);
      const data = response.data.data;
      setTicket(data);
      setResolutionNotes(data.resolution_notes ?? "");

      if (data.user_id) {
        const [userRes, overviewRes] = await Promise.all([
          usersApi.get(data.user_id),
          participantJourneyApi.overview(data.user_id).catch(() => null),
        ]);
        setUser(userRes.data.data);
        if (overviewRes) {
          const overview = overviewRes.data.data;
          setEngagementCount(overview.engagements?.length ?? 0);
          const others = (overview.account?.tickets ?? []).filter(
            (row) => row.ticket_id !== data.ticket_id
          );
          setRelatedTickets(others);
        } else {
          setEngagementCount(0);
          setRelatedTickets([]);
        }
      } else {
        setUser(null);
        setEngagementCount(0);
        setRelatedTickets([]);
      }
    } catch (err) {
      setError(getApiError(err));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const headerSubtitle = useMemo(() => {
    if (!ticket) return undefined;
    return `${ticket.status} · ${ticket.contact_input} · ${formatDate(ticket.created_at)}`;
  }, [ticket]);

  usePageHeader({
    title: ticket ? `Ticket #${ticket.ticket_id}` : "Ticket",
    subtitle: headerSubtitle,
    backTo: "/support",
  });

  const markResolved = async () => {
    if (!ticket || ticket.status === "resolved") return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = resolutionNotes.trim();
      const response = await supportApi.updateTicketStatus(ticket.ticket_id, {
        status: "resolved",
        resolution_notes: trimmed || null,
      });
      setTicket(response.data.data);
      setResolutionNotes(response.data.data.resolution_notes ?? "");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reopenTicket = async () => {
    if (!ticket || ticket.status === "open") return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await supportApi.updateTicketStatus(ticket.ticket_id, { status: "open" });
      setTicket(response.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticketId) {
    return (
      <div className="p-6 text-sm text-red-600">
        Invalid ticket id.{" "}
        <Link to="/support" className="underline">
          Back to support
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-3">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        <Link to="/support" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="w-4 h-4" />
          Back to support tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${statusPillClass(
              ticket.status
            )}`}
          >
            {ticket.status}
          </span>
          <span className="text-sm text-zinc-500">Created {formatDate(ticket.created_at)}</span>
        </div>
        <PermissionGate category="support" action="edit">
          <div className="flex flex-wrap gap-2">
            {ticket.status === "open" ? (
              <button
                type="button"
                disabled={submitting || !mayEditSupport}
                onClick={() => void markResolved()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Mark resolved"}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !mayEditSupport}
                onClick={() => void reopenTicket()}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-800 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Reopen ticket"}
              </button>
            )}
          </div>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Request</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wide">Contact</span>
                <p className="text-zinc-900 mt-0.5 break-words">{ticket.contact_input}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wide">User ID</span>
                <p className="text-zinc-900 mt-0.5">{ticket.user_id ?? "Guest / Unlinked"}</p>
              </div>
            </div>
            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wide">Query</span>
              <p className="text-zinc-900 mt-1 whitespace-pre-wrap break-words">{ticket.query_text}</p>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Resolution</h2>
            {ticket.status === "open" ? (
              <>
                <p className="text-sm text-zinc-600">
                  Optional internal notes. You and the resolve time are recorded automatically when you mark this
                  resolved.
                </p>
                <textarea
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                  disabled={!mayEditSupport || submitting}
                  maxLength={1000}
                  className="w-full min-h-28 px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="What was done, outcome, follow-up…"
                />
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Resolved by</span>
                    <p className="text-zinc-900 mt-0.5">
                      {ticket.resolved_by_employee_name ??
                        (ticket.resolved_by_employee_id != null
                          ? `Employee #${ticket.resolved_by_employee_id}`
                          : "—")}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wide">Resolved at</span>
                    <p className="text-zinc-900 mt-0.5">{formatDate(ticket.resolved_at)}</p>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">Notes</span>
                  <p className="text-zinc-900 mt-0.5 whitespace-pre-wrap break-words">
                    {ticket.resolution_notes?.trim() ? ticket.resolution_notes : "—"}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">User</h2>
            {ticket.user_id && user ? (
              <>
                <div className="text-sm space-y-2">
                  <p className="font-medium text-zinc-900">{userDisplayName(user)}</p>
                  <p className="text-zinc-600">{user.phone}</p>
                  {user.email ? <p className="text-zinc-600 break-all">{user.email}</p> : null}
                  <p className="text-zinc-500 capitalize">Status: {user.status ?? "—"}</p>
                  {engagementCount > 0 ? (
                    <p className="text-zinc-500">{engagementCount} engagement(s) on journey</p>
                  ) : null}
                </div>
                <Link
                  to={`/users/${ticket.user_id}/journey`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:underline"
                >
                  Open participant journey
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No linked user profile.</p>
            )}
          </section>

          {relatedTickets.length > 0 ? (
            <section className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900">Other tickets</h2>
              <ul className="space-y-2">
                {relatedTickets.slice(0, 8).map((row) => (
                  <li key={row.ticket_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/support/${row.ticket_id}`)}
                      className="w-full text-left rounded-lg border border-zinc-100 px-3 py-2 hover:bg-zinc-50"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>#{row.ticket_id}</span>
                        <span className="capitalize">{row.status}</span>
                      </div>
                      <p className="text-sm text-zinc-800 line-clamp-2 mt-0.5">{row.query_text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
