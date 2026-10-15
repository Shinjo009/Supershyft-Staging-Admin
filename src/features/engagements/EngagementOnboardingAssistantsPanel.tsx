import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, UserCog, X } from "lucide-react";
import {
  employeesApi,
  getApiError,
  onboardingAssistantsApi,
  partnersApi,
  type EmployeeListItem,
  type OnboardingAssistant,
  type PartnerListItem,
} from "../../lib/api";
import { CreatePhleboModal } from "./CreatePhleboModal";
import { ConsoleUrlActions } from "./consoleUrlActions";

function getEmployeeDisplayName(emp: EmployeeListItem): string {
  if (emp.name?.trim()) return emp.name.trim();
  return `Employee ${emp.employee_id}`;
}

function getPartnerDisplayName(partner: PartnerListItem): string {
  if (partner.name?.trim()) return partner.name.trim();
  return `Partner ${partner.partner_id}`;
}

function getAssistantDisplayName(a: OnboardingAssistant): string {
  if (a.name?.trim()) return a.name.trim();
  if (a.kind === "employee" || (a.employee_id != null && a.partner_id == null)) {
    return `Employee ${a.employee_id}`;
  }
  if (a.partner_id != null) return `Partner ${a.partner_id}`;
  return "Assignee";
}

function assistantRowKey(a: OnboardingAssistant): string {
  if (a.kind === "employee" || (a.employee_id != null && !a.partner_id)) {
    return `employee-${a.employee_id}`;
  }
  return `partner-${a.partner_id}`;
}

function isEmployeeAssignee(a: OnboardingAssistant): boolean {
  return a.kind === "employee" || (a.employee_id != null && a.partner_id == null);
}

const ASSIGNABLE_EMPLOYEE_ROLES = new Set(["admin", "inferior_admin"]);

type AddAssigneeMode = "phlebo" | "expert" | "employee";

function formatStaffRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  if (role === "inferior_admin") return "Employee";
  if (role === "admin") return "Admin";
  if (role === "phlebo") return "Phlebo";
  if (role === "expert") return "Expert";
  if (role === "organization_manager") return "Organization Manager";
  return role;
}

export function EngagementOnboardingAssistantsPanel({
  engagementId,
  engagementStatus,
  canEdit = true,
}: {
  engagementId: number;
  engagementStatus?: string | null;
  engagementName?: string;
  canEdit?: boolean;
}) {
  const [assistants, setAssistants] = useState<OnboardingAssistant[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [assistantsError, setAssistantsError] = useState<string | null>(null);
  const [removingAssistantKey, setRemovingAssistantKey] = useState<string | null>(null);

  const [addAssistantsOpen, setAddAssistantsOpen] = useState(false);
  const [addAssigneeMode, setAddAssigneeMode] = useState<AddAssigneeMode>("phlebo");
  const [addCandidatePartners, setAddCandidatePartners] = useState<PartnerListItem[]>([]);
  const [addCandidateEmployees, setAddCandidateEmployees] = useState<EmployeeListItem[]>([]);
  const [addCandidatesLoading, setAddCandidatesLoading] = useState(false);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<number>>(new Set());
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());
  const [assigningAssistants, setAssigningAssistants] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [createPhleboModalOpen, setCreatePhleboModalOpen] = useState(false);

  const fetchAssistants = useCallback(async () => {
    setAssistantsLoading(true);
    setAssistantsError(null);
    try {
      const res = await onboardingAssistantsApi.list(engagementId);
      setAssistants(res.data.data);
    } catch (err) {
      setAssistantsError(getApiError(err));
    } finally {
      setAssistantsLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void fetchAssistants();
  }, [fetchAssistants]);

  const handleRemoveAssistant = async (a: OnboardingAssistant) => {
    const key = assistantRowKey(a);
    setRemovingAssistantKey(key);
    setAssistantsError(null);
    try {
      if (isEmployeeAssignee(a) && a.employee_id != null) {
        await onboardingAssistantsApi.removeEmployee(engagementId, a.employee_id);
      } else if (a.partner_id != null) {
        await onboardingAssistantsApi.removePartner(engagementId, a.partner_id);
      }
      await fetchAssistants();
    } catch (err) {
      setAssistantsError(getApiError(err));
    } finally {
      setRemovingAssistantKey(null);
    }
  };

  const openAddAssistants = async (mode: AddAssigneeMode) => {
    setAddAssigneeMode(mode);
    setAddAssistantsOpen(true);
    setSelectedPartnerIds(new Set());
    setSelectedEmployeeIds(new Set());
    setEmployeeSearch("");
    setAddCandidatePartners([]);
    setAddCandidateEmployees([]);
    setAddCandidatesLoading(true);
    try {
      if (mode === "employee") {
        const res = await employeesApi.list({ status: "active", limit: 100 });
        setAddCandidateEmployees(
          res.data.data.filter((e) => ASSIGNABLE_EMPLOYEE_ROLES.has((e.role || "").toLowerCase())),
        );
      } else {
        const res = await partnersApi.list({ status: "active", role: mode, limit: 100 });
        setAddCandidatePartners(res.data.data);
      }
    } catch (err) {
      setAssistantsError(getApiError(err));
    } finally {
      setAddCandidatesLoading(false);
    }
  };

  const togglePartnerSelection = (id: number) => {
    setSelectedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssignAssistants = async () => {
    const selectingEmployees = addAssigneeMode === "employee";
    if (selectingEmployees && selectedEmployeeIds.size === 0) return;
    if (!selectingEmployees && selectedPartnerIds.size === 0) return;
    setAssigningAssistants(true);
    setAssistantsError(null);
    try {
      await onboardingAssistantsApi.assign(
        engagementId,
        selectingEmployees
          ? { employee_ids: Array.from(selectedEmployeeIds) }
          : { partner_ids: Array.from(selectedPartnerIds) },
      );
      setAddAssistantsOpen(false);
      setSelectedPartnerIds(new Set());
      setSelectedEmployeeIds(new Set());
      await fetchAssistants();
    } catch (err) {
      setAssistantsError(getApiError(err));
    } finally {
      setAssigningAssistants(false);
    }
  };

  const assignedPartnerIds = useMemo(
    () => new Set(assistants.filter((a) => a.partner_id != null).map((a) => a.partner_id as number)),
    [assistants],
  );
  const assignedEmployeeIds = useMemo(
    () =>
      new Set(
        assistants.filter((a) => a.employee_id != null && !a.partner_id).map((a) => a.employee_id as number),
      ),
    [assistants],
  );

  const availablePartners = addCandidatePartners.filter((p) => !assignedPartnerIds.has(p.partner_id));
  const availableEmployees = addCandidateEmployees.filter((e) => !assignedEmployeeIds.has(e.employee_id));

  const q = employeeSearch.trim().toLowerCase();
  const filteredPartners = q
    ? availablePartners.filter((p) => {
        const name = getPartnerDisplayName(p).toLowerCase();
        return (
          String(p.partner_id).includes(q) ||
          (p.role ?? "").toLowerCase().includes(q) ||
          (p.phone ?? "").toLowerCase().includes(q) ||
          name.includes(q)
        );
      })
    : availablePartners;
  const filteredEmployees = q
    ? availableEmployees.filter((e) => {
        const name = getEmployeeDisplayName(e).toLowerCase();
        return (
          String(e.employee_id).includes(q) ||
          (e.role ?? "").toLowerCase().includes(q) ||
          (e.phone ?? "").toLowerCase().includes(q) ||
          name.includes(q)
        );
      })
    : availableEmployees;

  const addModeLabel =
    addAssigneeMode === "phlebo" ? "phlebos" : addAssigneeMode === "expert" ? "experts" : "employees";
  const selectedCount =
    addAssigneeMode === "employee" ? selectedEmployeeIds.size : selectedPartnerIds.size;

  const isRunning = (engagementStatus ?? "").toLowerCase() === "running";

  const closeAddPanel = () => {
    setAddAssistantsOpen(false);
    setSelectedPartnerIds(new Set());
    setSelectedEmployeeIds(new Set());
    setEmployeeSearch("");
  };

  return (
    <div className="p-4 space-y-4">
      {assistantsError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {assistantsError}
        </div>
      )}

      {isRunning && (
        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
          <p className="text-xs font-medium text-zinc-600 mb-2">Console URL for assigned assistants</p>
          <ConsoleUrlActions engagementId={engagementId} />
        </div>
      )}

      {!addAssistantsOpen && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-zinc-700">Assigned ({assistants.length})</p>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreatePhleboModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50"
                >
                  Create and Add phlebo
                </button>
                <button
                  type="button"
                  onClick={() => void openAddAssistants("phlebo")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add phlebo
                </button>
                <button
                  type="button"
                  onClick={() => void openAddAssistants("expert")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add expert
                </button>
                <button
                  type="button"
                  onClick={() => void openAddAssistants("employee")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add employee
                </button>
              </div>
            ) : null}
          </div>

          {assistantsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : assistants.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No onboarding assistants assigned yet.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
              {assistants.map((a) => {
                const key = assistantRowKey(a);
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                        <UserCog className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {getAssistantDisplayName(a)}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {a.role ? `Role: ${formatStaffRoleLabel(a.role)}` : "No role"}{" "}
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1 ${
                              a.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {a.status ?? "—"}
                          </span>
                        </p>
                      </div>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveAssistant(a)}
                        disabled={removingAssistantKey === key}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 shrink-0"
                        title="Remove assignee"
                        aria-label="Remove assignee"
                      >
                        {removingAssistantKey === key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {addAssistantsOpen && canEdit && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">Select {addModeLabel} to assign</p>
            <button
              type="button"
              onClick={closeAddPanel}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search by name, role, or ID…"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {addCandidatesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : addAssigneeMode === "employee" ? (
            filteredEmployees.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-500">
                {availableEmployees.length === 0
                  ? "All eligible employees are already assigned."
                  : "No employees match your search."}
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {filteredEmployees.map((e) => {
                  const checked = selectedEmployeeIds.has(e.employee_id);
                  return (
                    <li
                      key={e.employee_id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 ${
                        checked ? "bg-zinc-50" : "bg-white"
                      }`}
                      onClick={() => toggleEmployeeSelection(e.employee_id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployeeSelection(e.employee_id)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {getEmployeeDisplayName(e)}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {e.phone || e.email || (e.role ? `Role: ${e.role}` : "Employee")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : filteredPartners.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              {availablePartners.length === 0
                ? `All active ${addModeLabel} are already assigned.`
                : `No ${addModeLabel} match your search.`}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {filteredPartners.map((p) => {
                const checked = selectedPartnerIds.has(p.partner_id);
                return (
                  <li
                    key={p.partner_id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 ${
                      checked ? "bg-zinc-50" : "bg-white"
                    }`}
                    onClick={() => togglePartnerSelection(p.partner_id)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePartnerSelection(p.partner_id)}
                      onClick={(ev) => ev.stopPropagation()}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {getPartnerDisplayName(p)}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {p.phone || p.email || (p.role ? `Role: ${p.role}` : addAssigneeMode)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleAssignAssistants()}
              disabled={selectedCount === 0 || assigningAssistants}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {assigningAssistants
                ? "Assigning…"
                : `Assign${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </button>
            <button
              type="button"
              onClick={closeAddPanel}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <CreatePhleboModal
        open={createPhleboModalOpen}
        onClose={() => setCreatePhleboModalOpen(false)}
        engagementId={engagementId}
        onSuccess={async () => {
          setAssistantsError(null);
          await fetchAssistants();
        }}
      />
    </div>
  );
}
