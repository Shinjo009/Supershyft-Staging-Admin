import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import {
  partnersApi,
  expertTypesApi,
  expertsApi,
  type PartnerListItem,
  type PartnerCreate,
  type PartnerUpdate,
  type ExpertTypeItem,
  getApiError,
} from "../../lib/api";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";

const STATUS_OPTIONS = ["active", "inactive", "archived"];
const ROLE_OPTIONS = [
  { value: "phlebo", label: "Phlebo" },
  { value: "expert", label: "Expert" },
  { value: "organization_manager", label: "Organization Manager" },
] as const;
const SEARCH_DEBOUNCE_MS = 300;

type ModalMode = "add" | "edit";

const emptyForm = (): PartnerCreate => ({
  name: "",
  phone: "",
  email: "",
  role: "phlebo",
  status: "active",
});

const emptyExpertProfile = () => ({
  expert_type: "",
  specialization: "",
});

function roleLabel(role: string | null | undefined): string {
  if (role === "phlebo") return "Phlebo";
  if (role === "expert") return "Expert";
  if (role === "organization_manager") return "Organization Manager";
  return role || "—";
}

export function Partners() {
  const { canEditTask } = usePermissions();
  const mayEditDirectory = canEditTask("partners", "directory");
  const mayEditStatus = canEditTask("partners", "status");

  const [data, setData] = useState<PartnerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortKey, setSortKey] = useState("partner_id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selected, setSelected] = useState<PartnerListItem | null>(null);
  const [formData, setFormData] = useState<PartnerCreate>(emptyForm());
  const [expertProfile, setExpertProfile] = useState(emptyExpertProfile());
  const [hasExpertProfile, setHasExpertProfile] = useState(false);
  const [linkedExpertId, setLinkedExpertId] = useState<number | null>(null);
  const [expertTypes, setExpertTypes] = useState<ExpertTypeItem[]>([]);
  const [expertTypesLoading, setExpertTypesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isExpertRole = String(formData.role || "").toLowerCase() === "expert";
  const showExpertProfileFields =
    isExpertRole && (modalMode === "add" || !hasExpertProfile);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadExpertTypes = useCallback(async () => {
    setExpertTypesLoading(true);
    try {
      const res = await expertTypesApi.list();
      const types = res.data.data ?? [];
      setExpertTypes(types);
      if (types.length > 0) {
        setExpertProfile((prev) => ({
          ...prev,
          expert_type: prev.expert_type || types[0].type_key,
        }));
      }
    } catch {
      setExpertTypes([]);
    } finally {
      setExpertTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen && isExpertRole && showExpertProfileFields) {
      void loadExpertTypes();
    }
  }, [modalOpen, isExpertRole, showExpertProfileFields, loadExpertTypes]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await partnersApi.list({
        page,
        limit,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        search: debouncedSearch || undefined,
        sort_by: sortKey,
        sort_dir: sortDir,
      });
      setData(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, roleFilter, debouncedSearch, sortKey, sortDir]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, roleFilter]);

  const openAdd = () => {
    setSelected(null);
    setFormData(emptyForm());
    setExpertProfile(emptyExpertProfile());
    setHasExpertProfile(false);
    setLinkedExpertId(null);
    setModalMode("add");
    setModalOpen(true);
    setError(null);
  };

  const openEdit = async (row: PartnerListItem) => {
    setSelected(row);
    setFormData({
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      role: row.role ?? "phlebo",
      status: row.status ?? "active",
    });
    setExpertProfile(emptyExpertProfile());
    setHasExpertProfile(false);
    setLinkedExpertId(null);
    setModalMode("edit");
    setModalOpen(true);
    setError(null);

    try {
      const res = await partnersApi.get(row.partner_id);
      const detail = res.data.data;
      setHasExpertProfile(Boolean(detail.has_expert_profile));
      setLinkedExpertId(
        detail.expert_id != null && detail.expert_id > 0 ? detail.expert_id : null
      );
    } catch {
      setHasExpertProfile(false);
      setLinkedExpertId(null);
    }
  };

  const handleDeleteLinkedExpert = async () => {
    if (linkedExpertId == null) return;
    if (
      !window.confirm(
        "Delete this partner's expert profile? This cannot be undone. You can change partner role after deletion."
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await expertsApi.delete(linkedExpertId);
      setHasExpertProfile(false);
      setLinkedExpertId(null);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const phone = (formData.phone ?? "").trim();
    const email = (formData.email ?? "").trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    if (!phone && !email) {
      setError("Provide at least one of phone or email");
      return;
    }
    if (!formData.role) {
      setError("Role is required");
      return;
    }
    const role = String(formData.role).toLowerCase();

    let expertProfilePayload: { expert_type: string; specialization: string } | undefined;
    if (role === "expert" && (modalMode === "add" || !hasExpertProfile)) {
      const specialization = expertProfile.specialization.trim();
      const expertType = expertProfile.expert_type.trim();
      if (!specialization) {
        setError("Specialization is required for expert partners");
        return;
      }
      if (!expertType) {
        setError("Expert type is required for expert partners");
        return;
      }
      expertProfilePayload = { expert_type: expertType, specialization };
    }

    setSubmitting(true);
    setError(null);
    try {
      if (modalMode === "add") {
        await partnersApi.create({
          name,
          phone: phone || null,
          email: email || null,
          role: formData.role,
          status: formData.status ?? "active",
          expert_profile: expertProfilePayload,
        });
      } else if (selected) {
        const payload: PartnerUpdate = {
          name,
          phone: phone || null,
          email: email || null,
          role: formData.role,
          expert_profile: expertProfilePayload,
        };
        await partnersApi.update(selected.partner_id, payload);
      }
      setModalOpen(false);
      fetchList();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<PartnerListItem>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => <span className="font-medium text-zinc-900">{row.name || "—"}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      hideOnMobile: true,
      render: (row) => row.phone || "—",
    },
    {
      key: "email",
      label: "Email",
      hideOnTablet: true,
      render: (row) => row.email || "—",
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      hideOnMobile: true,
      render: (row) => roleLabel(row.role),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const isActive = (row.status ?? "").toLowerCase() === "active";
        return (
          <button
            type="button"
            disabled={!mayEditStatus}
            onClick={(event) => {
              event.stopPropagation();
              if (!mayEditStatus) return;
              const nextStatus = isActive ? "inactive" : "active";
              partnersApi
                .updateStatus(row.partner_id, nextStatus)
                .then(() => fetchList())
                .catch((err) => setError(getApiError(err)));
            }}
            className={`inline-flex items-center w-12 h-6 rounded-full transition disabled:cursor-not-allowed disabled:opacity-80 ${
              isActive ? "bg-emerald-500" : "bg-zinc-300"
            }`}
            aria-pressed={isActive}
            aria-label={`Set ${row.name} ${isActive ? "inactive" : "active"}`}
          >
            <span
              className={`h-5 w-5 bg-white rounded-full shadow transform transition ${
                isActive ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        );
      },
    },
  ];

  const handleSort = (key: string) => {
    setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
    setPage(1);
  };

  return (
    <div>
      <PageHeaderActions>
        <PermissionGate category="partners" taskKey="directory" action="edit">
          <HeaderActionButton label="Add Partner" icon={Plus} onClick={openAdd} />
        </PermissionGate>
      </PageHeaderActions>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:w-auto px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-auto px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
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
            keyExtractor={(r) => r.partner_id}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onEdit={mayEditDirectory ? openEdit : undefined}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "add" ? "Add Partner" : "Edit Partner"}
        maxWidthClassName="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="e.g. 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => {
                const nextRole = e.target.value;
                setFormData({ ...formData, role: nextRole });
                if (nextRole.toLowerCase() !== "expert") {
                  setExpertProfile(emptyExpertProfile());
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {showExpertProfileFields ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <p className="text-sm font-medium text-zinc-800">Expert profile</p>
              <p className="text-xs text-zinc-500">
                Creates a listing on the Experts page. Fees, availability, and other details can be
                added there later.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-2">
                  <span className="text-zinc-600 text-xs">Specialization *</span>
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                    value={expertProfile.specialization}
                    onChange={(e) =>
                      setExpertProfile((p) => ({ ...p, specialization: e.target.value }))
                    }
                    placeholder="e.g. General physician"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-zinc-600 text-xs">Expert type *</span>
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white"
                    value={expertProfile.expert_type}
                    onChange={(e) =>
                      setExpertProfile((p) => ({ ...p, expert_type: e.target.value }))
                    }
                    disabled={expertTypesLoading}
                  >
                    {expertTypes.length === 0 && (
                      <option value="">
                        {expertTypesLoading ? "Loading types…" : "No types available"}
                      </option>
                    )}
                    {expertTypes.map((et) => (
                      <option key={et.id} value={et.type_key}>
                        {et.type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}
          {modalMode === "edit" && hasExpertProfile ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs text-amber-900">
                This partner has an expert profile on the Experts page. To change role away from
                Expert, delete that profile first.
              </p>
              {linkedExpertId != null && mayEditDirectory ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleDeleteLinkedExpert()}
                  className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                >
                  Delete expert profile
                </button>
              ) : null}
            </div>
          ) : null}
          {isExpertRole && modalMode === "edit" && hasExpertProfile ? (
            <p className="text-xs text-zinc-500">
              Additional expert details (fees, availability) are on the Experts page.
            </p>
          ) : null}
          <p className="text-xs text-zinc-500">Provide at least one of phone or email.</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving..." : modalMode === "add" ? "Create" : "Update"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
