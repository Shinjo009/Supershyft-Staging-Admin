import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Plus, Search } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
import { UserSearchPicker } from "../../shared/ui/UserSearchPicker";
import {
  getApiError,
  supportApi,
  type SupportTicket,
  type SupportTicketCreate,
  type SupportTicketStatus,
} from "../../lib/api";

const STATUS_OPTIONS: SupportTicketStatus[] = ["open", "resolved"];

export function SupportTickets() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | SupportTicketStatus>("");
  const [sortKey, setSortKey] = useState<"ticket_id" | "status" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<SupportTicketCreate>({
    user_id: 0,
    query_text: "",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supportApi.listTickets(
        statusFilter ? { status: statusFilter } : undefined
      );
      setTickets(response.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = useMemo(() => {
    let rows = tickets;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((ticket) => {
        const contact = ticket.contact_input.toLowerCase();
        const queryText = ticket.query_text.toLowerCase();
        return (
          contact.includes(q) ||
          queryText.includes(q) ||
          String(ticket.ticket_id).includes(q) ||
          String(ticket.user_id ?? "").includes(q)
        );
      });
    }

    const sorted = [...rows].sort((a, b) => {
      const value = (ticket: SupportTicket) => {
        if (sortKey === "ticket_id") return ticket.ticket_id;
        if (sortKey === "status") return ticket.status;
        return ticket.created_at;
      };
      const aVal = value(a);
      const bVal = value(b);
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [search, sortDir, sortKey, tickets]);

  const openDetails = (ticket: SupportTicket) => {
    navigate(`/support/${ticket.ticket_id}`);
  };

  useEffect(() => {
    const ticketId = (location.state as { viewTicketId?: number } | null)?.viewTicketId;
    if (!ticketId) return;
    navigate(`/support/${ticketId}`, { replace: true, state: null });
  }, [location.state, navigate]);

  const handleSort = (key: string) => {
    const nextKey = key as "ticket_id" | "status" | "created_at";
    setSortDir((dir) => (sortKey === nextKey ? (dir === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(nextKey);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusPillClass = (status: SupportTicketStatus) => {
    if (status === "open") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: "ticket_id",
      label: "Ticket",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900">#{row.ticket_id}</span>
          <span className="text-xs text-zinc-500 truncate max-w-[240px]">{row.contact_input}</span>
        </div>
      ),
    },
    {
      key: "query_text",
      label: "Query",
      hideOnTablet: true,
      render: (row) => (
        <p className="text-zinc-600 line-clamp-2 max-w-[420px]">{row.query_text}</p>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${statusPillClass(
            row.status
          )}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      hideOnMobile: true,
      render: (row) => <span className="text-zinc-600">{formatDate(row.created_at)}</span>,
    },
  ];

  const submitCreate = async () => {
    if (!createForm.user_id || createForm.user_id <= 0 || !createForm.query_text.trim()) {
      setError("User and query are required.");
      return;
    }

    setCreateSubmitting(true);
    setError(null);
    try {
      await supportApi.submitTicket({
        user_id: createForm.user_id,
        query_text: createForm.query_text.trim(),
      });
      setCreateOpen(false);
      setCreateForm({ user_id: 0, query_text: "" });
      await fetchTickets();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeaderActions>
        <PermissionGate category="support" action="edit">
          <HeaderActionButton
            label="Create Ticket"
            icon={Plus}
            onClick={() => {
              setCreateForm({ user_id: 0, query_text: "" });
              setError(null);
              setCreateOpen(true);
            }}
          />
        </PermissionGate>
      </PageHeaderActions>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by ticket, contact, query or user id..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "" | SupportTicketStatus)}
          className="sm:w-auto px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
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
            data={filtered}
            keyExtractor={(row) => row.ticket_id}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onView={openDetails}
          />
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateForm({ user_id: 0, query_text: "" });
        }}
        title="Create Support Ticket"
        maxWidthClassName="max-w-xl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitCreate();
          }}
          className="space-y-4"
        >
          <UserSearchPicker
            label="User"
            value={createForm.user_id}
            onChange={(userId) => setCreateForm((prev) => ({ ...prev, user_id: userId }))}
            required
            disabled={createSubmitting}
            placeholder="Search by name, phone, or email…"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Query *</label>
            <textarea
              value={createForm.query_text}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, query_text: event.target.value }))
              }
              className="w-full min-h-28 px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Describe the issue..."
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={createSubmitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {createSubmitting ? "Submitting..." : "Submit Ticket"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreateForm({ user_id: 0, query_text: "" });
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
