import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, Search, Trash2, UserCog, X } from "lucide-react";
import {
  employeesApi,
  getApiError,
  onboardingAssistantsApi,
  type EmployeeListItem,
  type OnboardingAssistant,
} from "../../lib/api";
import {
  AddAssistantByPhoneModal,
  type AddAssistantKind,
} from "./AddAssistantByPhoneModal";
import { ConsoleUrlActions } from "./consoleUrlActions";

type RoleTab = "all" | "phlebo" | "expert" | "staff";

const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "phlebo", label: "Phlebos" },
  { key: "expert", label: "Experts" },
  { key: "staff", label: "Staff" },
];

function getEmployeeDisplayName(emp: EmployeeListItem): string {
  if (emp.name?.trim()) return emp.name.trim();
  return `Employee ${emp.employee_id}`;
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

type AssistantCategory = "phlebo" | "expert" | "staff";

function getAssistantCategory(a: OnboardingAssistant): AssistantCategory {
  if (isEmployeeAssignee(a)) return "staff";
  const role = (a.role ?? "").toLowerCase();
  if (role === "expert") return "expert";
  return "phlebo";
}

function getRolePillLabel(a: OnboardingAssistant): string {
  const cat = getAssistantCategory(a);
  if (cat === "staff" && a.role) return formatStaffRoleLabel(a.role);
  if (cat === "expert") return "Expert";
  return "Phlebo";
}

function matchesListSearch(a: OnboardingAssistant, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = getAssistantDisplayName(a).toLowerCase();
  const role = (a.role ?? "").toLowerCase();
  const phone = (a.phone ?? "").toLowerCase();
  const email = (a.email ?? "").toLowerCase();
  const id = String(a.partner_id ?? a.employee_id ?? "");
  return (
    name.includes(q) ||
    role.includes(q) ||
    phone.includes(q) ||
    email.includes(q) ||
    id.includes(q)
  );
}

const ASSIGNABLE_EMPLOYEE_ROLES = new Set(["admin", "inferior_admin"]);

function formatStaffRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  if (role === "inferior_admin") return "Employee";
  if (role === "admin") return "Admin";
  if (role === "phlebo") return "Phlebo";
  if (role === "expert") return "Expert";
  if (role === "organization_manager") return "Organization Manager";
  return role;
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
        status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {status ?? "—"}
    </span>
  );
}

function RolePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
      {label}
    </span>
  );
}

function AssistantList({
  items,
  canEdit,
  removingAssistantKey,
  onRemove,
  showRolePill,
  showStaffRole,
  emptyMessage,
  searchQuery,
}: {
  items: OnboardingAssistant[];
  canEdit: boolean;
  removingAssistantKey: string | null;
  onRemove: (a: OnboardingAssistant) => void;
  showRolePill: boolean;
  showStaffRole: boolean;
  emptyMessage: string;
  searchQuery: string;
}) {
  if (items.length === 0) {
    const trimmed = searchQuery.trim();
    return (
      <div className="py-10 px-4 text-center text-sm text-zinc-500">
        {trimmed ? `No matches for "${trimmed}".` : emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden max-h-[min(28rem,60vh)] overflow-y-auto">
      {items.map((a) => {
        const key = assistantRowKey(a);
        let secondary: ReactNode = null;
        if (showRolePill) {
          secondary = <RolePill label={getRolePillLabel(a)} />;
        } else if (showStaffRole && a.role) {
          secondary = <span>{formatStaffRoleLabel(a.role)}</span>;
        } else if (a.phone || a.email) {
          secondary = <span>{a.phone || a.email}</span>;
        }

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
                <p className="text-xs text-zinc-500 truncate flex flex-wrap items-center gap-1.5">
                  {secondary}
                  <StatusBadge status={a.status} />
                </p>
              </div>
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={() => void onRemove(a)}
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
  );
}

const primaryActionClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800";
const subTabClass = (active: boolean) =>
  `px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
    active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"
  }`;

export function EngagementOnboardingAssistantsPanel({
  engagementId,
  engagementStatus,
  engagementCode,
  engagementName,
  canEdit = true,
}: {
  engagementId: number;
  engagementStatus?: string | null;
  engagementCode?: string | null;
  engagementName?: string;
  canEdit?: boolean;
}) {
  const [assistants, setAssistants] = useState<OnboardingAssistant[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [assistantsError, setAssistantsError] = useState<string | null>(null);
  const [removingAssistantKey, setRemovingAssistantKey] = useState<string | null>(null);

  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>("phlebo");
  const [listSearch, setListSearch] = useState("");
  const [defaultTabSet, setDefaultTabSet] = useState(false);

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addCandidateEmployees, setAddCandidateEmployees] = useState<EmployeeListItem[]>([]);
  const [addCandidatesLoading, setAddCandidatesLoading] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());
  const [assigningAssistants, setAssigningAssistants] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [addByPhoneKind, setAddByPhoneKind] = useState<AddAssistantKind | null>(null);

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

  const { phlebos, experts, staff } = useMemo(() => {
    const phleboList: OnboardingAssistant[] = [];
    const expertList: OnboardingAssistant[] = [];
    const staffList: OnboardingAssistant[] = [];
    for (const a of assistants) {
      const cat = getAssistantCategory(a);
      if (cat === "expert") expertList.push(a);
      else if (cat === "staff") staffList.push(a);
      else phleboList.push(a);
    }
    return { phlebos: phleboList, experts: expertList, staff: staffList };
  }, [assistants]);

  useEffect(() => {
    if (defaultTabSet || assistantsLoading) return;
    setDefaultTabSet(true);
    if (phlebos.length === 0) {
      setActiveRoleTab("all");
    }
  }, [assistantsLoading, defaultTabSet, phlebos.length]);

  const tabCounts: Record<RoleTab, number> = useMemo(
    () => ({
      all: assistants.length,
      phlebo: phlebos.length,
      expert: experts.length,
      staff: staff.length,
    }),
    [assistants.length, phlebos.length, experts.length, staff.length],
  );

  const baseListForTab = useMemo((): OnboardingAssistant[] => {
    switch (activeRoleTab) {
      case "phlebo":
        return phlebos;
      case "expert":
        return experts;
      case "staff":
        return staff;
      default:
        return assistants;
    }
  }, [activeRoleTab, assistants, phlebos, experts, staff]);

  const listSearchTrimmed = listSearch.trim();
  const displayedList = useMemo(
    () => baseListForTab.filter((a) => matchesListSearch(a, listSearchTrimmed)),
    [baseListForTab, listSearchTrimmed],
  );

  const otherTabsHaveMatches = useMemo(() => {
    if (!listSearchTrimmed || displayedList.length > 0) return false;
    const buckets: { tab: RoleTab; items: OnboardingAssistant[] }[] = [
      { tab: "all", items: assistants },
      { tab: "phlebo", items: phlebos },
      { tab: "expert", items: experts },
      { tab: "staff", items: staff },
    ];
    return buckets.some(
      (b) =>
        b.tab !== activeRoleTab &&
        b.items.some((a) => matchesListSearch(a, listSearchTrimmed)),
    );
  }, [
    activeRoleTab,
    assistants,
    displayedList.length,
    experts,
    listSearchTrimmed,
    phlebos,
    staff,
  ]);

  const activeTabLabel = ROLE_TABS.find((t) => t.key === activeRoleTab)?.label ?? "tab";

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

  const loadStaffCandidates = useCallback(async () => {
    setAddCandidatesLoading(true);
    try {
      const res = await employeesApi.list({ status: "active", limit: 100 });
      setAddCandidateEmployees(
        res.data.data.filter((e) => ASSIGNABLE_EMPLOYEE_ROLES.has((e.role || "").toLowerCase())),
      );
    } catch (err) {
      setAssistantsError(getApiError(err));
    } finally {
      setAddCandidatesLoading(false);
    }
  }, []);

  const openAddStaff = async () => {
    setAddStaffOpen(true);
    setSelectedEmployeeIds(new Set());
    setStaffSearch("");
    setAddCandidateEmployees([]);
    await loadStaffCandidates();
  };

  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssignStaff = async () => {
    if (selectedEmployeeIds.size === 0) return;
    setAssigningAssistants(true);
    setAssistantsError(null);
    try {
      await onboardingAssistantsApi.assign(engagementId, {
        employee_ids: Array.from(selectedEmployeeIds),
      });
      setAddStaffOpen(false);
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

  const availableEmployees = addCandidateEmployees.filter((e) => !assignedEmployeeIds.has(e.employee_id));

  const q = staffSearch.trim().toLowerCase();
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

  const selectedStaffCount = selectedEmployeeIds.size;

  const isRunning = (engagementStatus ?? "").toLowerCase() === "running";

  const closeAddStaffPanel = () => {
    setAddStaffOpen(false);
    setSelectedEmployeeIds(new Set());
    setStaffSearch("");
  };

  const roleTabActions = useMemo(() => {
    if (!canEdit || activeRoleTab === "all") return null;
    if (activeRoleTab === "phlebo") {
      return (
        <button type="button" onClick={() => setAddByPhoneKind("phlebo")} className={primaryActionClass}>
          <Plus className="w-3.5 h-3.5" />
          Add phlebos
        </button>
      );
    }
    if (activeRoleTab === "expert") {
      return (
        <button type="button" onClick={() => setAddByPhoneKind("expert")} className={primaryActionClass}>
          <Plus className="w-3.5 h-3.5" />
          Add experts
        </button>
      );
    }
    return (
      <button type="button" onClick={() => void openAddStaff()} className={primaryActionClass}>
        <Plus className="w-3.5 h-3.5" />
        Add staff
      </button>
    );
  }, [activeRoleTab, canEdit]);

  const emptyMessageForTab =
    activeRoleTab === "phlebo"
      ? "No phlebos assigned."
      : activeRoleTab === "expert"
        ? "No experts assigned."
        : activeRoleTab === "staff"
          ? "No staff assigned."
          : "No assistants assigned yet.";

  return (
    <div className="p-4 space-y-4">
      {assistantsError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {assistantsError}
        </div>
      )}

      {isRunning && !addStaffOpen && (
        <div className="border-b border-zinc-200">
          <ConsoleUrlActions
            engagementId={engagementId}
            engagementCode={engagementCode}
            engagementName={engagementName}
            variant="compact"
          />
        </div>
      )}

      {assistantsLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : addStaffOpen && canEdit ? (
        <div className="space-y-3 border border-zinc-200 rounded-xl p-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Add staff to this engagement</p>
              <p className="text-xs text-zinc-500 mt-0.5">Select staff to assign</p>
            </div>
            <button
              type="button"
              onClick={closeAddStaffPanel}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 shrink-0"
              aria-label="Back to assigned lists"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search by name, role, or ID…"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {addCandidatesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              {availableEmployees.length === 0
                ? "All eligible staff are already assigned."
                : "No staff match your search."}
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
                        {e.phone || e.email || (e.role ? `Role: ${e.role}` : "Staff")}
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
              onClick={() => void handleAssignStaff()}
              disabled={selectedStaffCount === 0 || assigningAssistants}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {assigningAssistants
                ? "Assigning…"
                : `Assign${selectedStaffCount > 0 ? ` (${selectedStaffCount})` : ""}`}
            </button>
            <button
              type="button"
              onClick={closeAddStaffPanel}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search assigned assistants…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto min-w-0 [&::-webkit-scrollbar]:hidden">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRoleTab(tab.key)}
                  className={subTabClass(activeRoleTab === tab.key)}
                >
                  {tab.label} ({tabCounts[tab.key]})
                </button>
              ))}
            </div>
            {roleTabActions ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0">{roleTabActions}</div>
            ) : null}
          </div>

          {otherTabsHaveMatches ? (
            <p className="text-xs text-zinc-500">
              No matches in {activeTabLabel}. Try All or another tab.
            </p>
          ) : null}

          <AssistantList
            items={displayedList}
            canEdit={canEdit}
            removingAssistantKey={removingAssistantKey}
            onRemove={handleRemoveAssistant}
            showRolePill={activeRoleTab === "all"}
            showStaffRole={activeRoleTab === "staff"}
            emptyMessage={emptyMessageForTab}
            searchQuery={listSearchTrimmed}
          />
        </>
      )}

      {addByPhoneKind ? (
        <AddAssistantByPhoneModal
          open={addByPhoneKind != null}
          onClose={() => setAddByPhoneKind(null)}
          engagementId={engagementId}
          kind={addByPhoneKind}
          assignedPartnerIds={assignedPartnerIds}
          onSuccess={async () => {
            setAssistantsError(null);
            await fetchAssistants();
          }}
        />
      ) : null}
    </div>
  );
}
