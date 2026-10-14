import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Bell,
  Loader2,
  Monitor,
  Pencil,
  ScrollText,
  Users,
} from "lucide-react";
import {
  HeaderActionButton,
  PageHeaderActions,
  usePageHeader,
} from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import { usePermissions } from "../../contexts/PermissionContext";
import { EngagementNotificationModal } from "./EngagementNotificationModal";
import { EngagementOperationsPanel } from "./EngagementOperationsPanel";
import { EngagementParticipantsPanel } from "./EngagementParticipantsPanel";
import { isCampSetupComplete, isPhleboGuideConfigured } from "./engagementCampReadiness";
import {
  EngagementNotificationsTab,
  EngagementOverviewTab,
} from "./EngagementViewTabs";
import { buildIntegrationLogsPath } from "../integration-logs/integrationSyncLogsUtils";
import { formatEngagementStatusLabel } from "./engagementViewShared";
import {
  engagementChecklistsApi,
  engagementNotificationsApi,
  engagementTypesApi,
  engagementsApi,
  getApiError,
  onboardingAssistantsApi,
  type AssessmentPackage,
  type EngagementNotificationItem,
  type ChecklistReadiness,
  type DiagnosticPackageListItem,
  type Engagement,
  type EngagementTypeItem,
  type NotificationServiceItem,
  type OrganizationListItem,
} from "../../lib/api";

const DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "notifications", label: "Notifications" },
  { key: "operations", label: "Operations" },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["key"];

function readinessFromChecklists(
  checklists: { readiness: { done: number; total: number; percent: number } }[],
): ChecklistReadiness | null {
  if (checklists.length === 0) return null;
  const done = checklists.reduce((sum, cl) => sum + (cl.readiness?.done ?? 0), 0);
  const total = checklists.reduce((sum, cl) => sum + (cl.readiness?.total ?? 0), 0);
  if (total === 0) return { done: 0, total: 0, percent: 0 };
  return { done, total, percent: Math.round((done / total) * 100) };
}

export function EngagementDetailPage() {
  const { engagementCode } = useParams<{ engagementCode: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEditTask } = usePermissions();
  const mayEditChecklists = canEditTask("checklists_tasks", "assignments");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [typeCode, setTypeCode] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [engagementTypes, setEngagementTypes] = useState<EngagementTypeItem[]>([]);
  const [assessmentPackages, setAssessmentPackages] = useState<AssessmentPackage[]>([]);
  const [diagnosticPackages, setDiagnosticPackages] = useState<DiagnosticPackageListItem[]>([]);
  const [notificationServices, setNotificationServices] = useState<NotificationServiceItem[]>([]);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [campSetupComplete, setCampSetupComplete] = useState<boolean | undefined>(undefined);
  const [phleboGuideConfigured, setPhleboGuideConfigured] = useState<boolean | undefined>(undefined);

  const activeTab = (searchParams.get("tab") as DetailTab | "progress" | null) ?? null;

  const resolvedTab: DetailTab = useMemo(() => {
    if (activeTab === "progress") return "overview";
    if (activeTab && DETAIL_TABS.some((t) => t.key === activeTab)) {
      return activeTab;
    }
    return "overview";
  }, [activeTab]);

  useEffect(() => {
    if (searchParams.get("tab") === "progress") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        return next;
      });
    }
  }, [searchParams, setSearchParams]);

  const setTab = (tab: DetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "overview") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      return next;
    });
  };

  const getOrgName = useCallback(
    (organizationId?: number | null) => {
      if (!organizationId) return "—";
      return organizations.find((o) => o.organization_id === organizationId)?.name ?? "—";
    },
    [organizations],
  );

  const getTypeDisplayName = useCallback(
    (type: string | number | null | undefined) => {
      if (type == null || type === "") return undefined;
      if (typeof type === "string" && !/^\d+$/.test(type)) return type;
      const id = typeof type === "number" ? type : Number(type);
      const row = engagementTypes.find((t) => t.id === id);
      return row?.display_name ?? row?.code;
    },
    [engagementTypes],
  );

  const notificationServiceLabel = useCallback(
    (serviceKey: string | null | undefined) => {
      if (!serviceKey) return "—";
      const svc = notificationServices.find((s) => s.service_key === serviceKey);
      return svc?.display_name ?? serviceKey;
    },
    [notificationServices],
  );

  const loadEngagement = useCallback(async () => {
    const code = (engagementCode ?? "").trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const [engRes, bootstrapRes, typesRes] = await Promise.all([
        engagementsApi.getByCode(code),
        engagementsApi.formBootstrap(),
        engagementTypesApi.list(),
      ]);
      const detail = engRes.data.data;
      let readiness: ChecklistReadiness | null = null;
      try {
        const clRes = await engagementChecklistsApi.list(detail.engagement_id);
        readiness = readinessFromChecklists(clRes.data.data);
      } catch {
        readiness = null;
      }
      setEngagement({ ...detail, readiness } as Engagement & { readiness?: ChecklistReadiness | null });
      const bootstrap = bootstrapRes.data.data;
      setAssessmentPackages(bootstrap.assessment_packages ?? []);
      setDiagnosticPackages(bootstrap.diagnostic_packages ?? []);
      setNotificationServices(bootstrap.notification_services ?? []);
      setOrganizations(bootstrap.organizations ?? []);
      const types = typesRes.data.data ?? [];
      setEngagementTypes(types);
      const typeId = detail.engagement_type;
      const match = types.find((t) => t.id === typeId || t.code === typeId);
      setTypeCode(match?.code ?? (typeof typeId === "string" ? typeId : null));
      let configuredNotifications: EngagementNotificationItem[] = [];
      let assistantCount = 0;
      try {
        const [asstRes, notifRes] = await Promise.all([
          onboardingAssistantsApi.list(detail.engagement_id),
          engagementNotificationsApi.getForEngagement(detail.engagement_id),
        ]);
        assistantCount = (asstRes.data.data ?? []).length;
        configuredNotifications = Array.isArray(notifRes.data.data) ? notifRes.data.data : [];
      } catch {
        assistantCount = 0;
        configuredNotifications = [];
      }
      const readinessInput = {
        engagement: detail,
        onboardingAssistantCount: assistantCount,
        configuredNotifications,
      };
      setCampSetupComplete(isCampSetupComplete(readinessInput));
      setPhleboGuideConfigured(isPhleboGuideConfigured(readinessInput));
    } catch (err) {
      setError(getApiError(err));
      setEngagement(null);
    } finally {
      setLoading(false);
    }
  }, [engagementCode]);

  useEffect(() => {
    void loadEngagement();
  }, [loadEngagement]);

  const typeLabel = getTypeDisplayName(engagement?.engagement_type);

  const headerConfig = useMemo(() => {
    if (!engagement) return null;
    const subtitle = [
      formatEngagementStatusLabel(engagement.status),
      engagement.engagement_code,
      typeLabel,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: engagement.engagement_name || engagement.engagement_code || engagementCode || "Engagement",
      subtitle,
      backTo: "/engagements",
    };
  }, [engagement, engagementCode, typeLabel]);

  usePageHeader(headerConfig);

  const syncLogsTo = engagement
    ? buildIntegrationLogsPath({
        provider: "healthians",
        engagement: String(engagement.engagement_id),
        time: "all",
      })
    : undefined;

  const openEdit = () => {
    const code = (engagement?.engagement_code ?? engagementCode ?? "").trim();
    if (!code) return;
    navigate(`/engagements/${encodeURIComponent(code)}/edit`);
  };

  if (!engagementCode) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Missing engagement code.{" "}
        <Link to="/engagements" className="underline">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {engagement ? (
        <PageHeaderActions>
          <PermissionGate category="engagements" taskKey="records" action="edit">
            <HeaderActionButton label="Edit" icon={Pencil} onClick={openEdit} variant="secondary" />
          </PermissionGate>
          <PermissionGate category="notifications" action="edit">
            <HeaderActionButton
              label="Notify"
              icon={Bell}
              onClick={() => setNotifyOpen(true)}
              variant="secondary"
            />
          </PermissionGate>
          <HeaderActionButton
            label="Console"
            icon={Monitor}
            iconOnly
            onClick={() => navigate(`/engagements/console?engagement=${engagement.engagement_id}`)}
            variant="secondary"
          />
          <HeaderActionButton
            label="Participants"
            icon={Users}
            onClick={() => setTab("participants")}
            variant="secondary"
          />
          {syncLogsTo ? (
            <PermissionGate category="system_monitoring">
              <HeaderActionButton
                label="Sync logs"
                icon={ScrollText}
                iconOnly
                onClick={() => navigate(syncLogsTo)}
                variant="secondary"
              />
            </PermissionGate>
          ) : null}
        </PageHeaderActions>
      ) : null}

      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="flex gap-1 mb-5 border-b border-zinc-200 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                resolvedTab === tab.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {error ? (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : engagement ? (
          <>
            {resolvedTab === "overview" ? (
              <div className="space-y-4">
                <EngagementOverviewTab
                  engagement={engagement}
                  orgName={getOrgName(engagement.organization_id)}
                  assessmentPackages={assessmentPackages}
                  diagnosticPackages={diagnosticPackages}
                  notificationServiceLabel={notificationServiceLabel}
                  typeLabel={typeLabel}
                  typeCode={typeCode}
                  setupVerified={campSetupComplete}
                  phleboGuideConfigured={phleboGuideConfigured}
                  engagementCode={engagement.engagement_code ?? engagementCode}
                  onManageChecklists={
                    mayEditChecklists
                      ? () =>
                          navigate("/engagements", {
                            state: {
                              openChecklistEngagementId: engagement.engagement_id,
                              returnToEngagementCode: engagement.engagement_code ?? engagementCode,
                            },
                          })
                      : undefined
                  }
                  onOpenNotifications={() => setTab("notifications")}
                />
              </div>
            ) : null}

            {resolvedTab === "participants" ? (
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <EngagementParticipantsPanel
                  engagementId={engagement.engagement_id}
                  engagementName={engagement.engagement_name ?? engagement.engagement_code ?? undefined}
                />
              </div>
            ) : null}

            {resolvedTab === "notifications" ? (
              <EngagementNotificationsTab
                engagement={engagement}
                notificationServiceLabel={notificationServiceLabel}
              />
            ) : null}

            {resolvedTab === "operations" ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-3xl">
                <EngagementOperationsPanel
                  engagement={engagement}
                  active={true}
                  onEngagementUpdated={() => void loadEngagement()}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {engagement ? (
        <>
          <EngagementNotificationModal
            open={notifyOpen}
            onClose={() => setNotifyOpen(false)}
            engagement={engagement}
          />
        </>
      ) : null}
    </div>
  );
}
