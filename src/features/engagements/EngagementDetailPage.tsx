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
import { Modal } from "../../shared/ui/Modal";
import { ParticipantsModal } from "../../shared/ui/ParticipantsModal";
import { computeCampNo } from "./campNo";
import { EngagementFormModal } from "./EngagementFormModal";
import { engagementToFormData } from "./engagementFormData";
import { EngagementNotificationModal } from "./EngagementNotificationModal";
import { EngagementOperationsPanel } from "./EngagementOperationsPanel";
import { EngagementProgressTab } from "./EngagementProgressTab";
import { EngagementParticipantsPanel } from "./EngagementParticipantsPanel";
import {
  EngagementNotificationsTab,
  EngagementOverviewTab,
} from "./EngagementViewTabs";
import { buildIntegrationLogsPath } from "../integration-logs/integrationSyncLogsUtils";
import { formatEngagementStatusLabel } from "./engagementViewShared";
import {
  engagementChecklistsApi,
  engagementParticipantProgressApi,
  engagementTypesApi,
  engagementsApi,
  getApiError,
  type EngagementParticipantProgressResponse,
  type AssessmentPackage,
  type ChecklistReadiness,
  type DiagnosticPackageListItem,
  type Engagement,
  type EngagementCreate,
  type EngagementTypeItem,
  type NotificationServiceItem,
  type OrganizationListItem,
} from "../../lib/api";

const DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "progress", label: "Progress" },
  { key: "participants", label: "Participants" },
  { key: "notifications", label: "Notifications" },
  { key: "operations", label: "Operations" },
] as const;

type DetailTab = (typeof DETAIL_TABS)[number]["key"];

function isProgressDefaultType(typeCode: string | null | undefined): boolean {
  const code = (typeCode ?? "").toLowerCase();
  return code === "bio_ai_with_consultation" || code === "blood_test_with_consultation";
}

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

  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<EngagementCreate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [campNoConfirm, setCampNoConfirm] = useState<{
    payload: Record<string, unknown>;
    currentCampNo: number | null;
    nextCampNo: number | null;
  } | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [progressSnapshot, setProgressSnapshot] = useState<EngagementParticipantProgressResponse | null>(
    null,
  );

  const activeTab = (searchParams.get("tab") as DetailTab | null) ?? null;

  const resolvedTab: DetailTab = useMemo(() => {
    if (activeTab && DETAIL_TABS.some((t) => t.key === activeTab)) {
      return activeTab;
    }
    if (isProgressDefaultType(typeCode)) return "progress";
    return "overview";
  }, [activeTab, typeCode]);

  const setTab = (tab: DetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
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
      try {
        const progRes = await engagementParticipantProgressApi.get(detail.engagement_id);
        setProgressSnapshot(progRes.data.data);
      } catch {
        setProgressSnapshot(null);
      }
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

  const emptyToNull = (value: string | null | undefined) => {
    const trimmed = (value ?? "").trim();
    return trimmed ? trimmed : null;
  };

  const openEdit = () => {
    if (!engagement) return;
    setFormData(engagementToFormData(engagement));
    setEditOpen(true);
  };

  const performEngagementUpdate = async (
    engagementId: number,
    payload: Record<string, unknown>,
  ) => {
    await engagementsApi.update(engagementId, payload as never);
    setEditOpen(false);
    setCampNoConfirm(null);
    await loadEngagement();
  };

  const handleSubmit = async (data: EngagementCreate) => {
    if (!engagement) return;
    const orgId = data.organization_id && data.organization_id > 0 ? data.organization_id : null;
    if (!data.start_date || !data.end_date) {
      setError("Please fill start and end dates");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const locationFields = {
        city: emptyToNull(data.city),
        address: emptyToNull(data.address),
        sub_locality: emptyToNull(data.sub_locality),
        landmark: emptyToNull(data.landmark),
        pincode: emptyToNull(data.pincode),
        state: emptyToNull(data.state),
        country: emptyToNull(data.country),
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      const nextCampNo = computeCampNo(orgId, data.start_date);
      const currentCampNo = engagement.camp_no ?? null;
      const payload = {
        engagement_name: data.engagement_name,
        engagement_code: (data.engagement_code ?? "").trim(),
        metsights_engagement_id: data.metsights_engagement_id?.trim() || null,
        organization_id: orgId,
        engagement_type: data.engagement_type,
        consultations: data.consultations ?? null,
        assessment_package_id:
          data.assessment_package_id && data.assessment_package_id > 0
            ? data.assessment_package_id
            : null,
        diagnostic_package_id:
          data.diagnostic_package_id && data.diagnostic_package_id > 0
            ? data.diagnostic_package_id
            : null,
        diagnostic_package_id_male:
          data.diagnostic_package_id_male && data.diagnostic_package_id_male > 0
            ? data.diagnostic_package_id_male
            : null,
        diagnostic_package_id_female:
          data.diagnostic_package_id_female && data.diagnostic_package_id_female > 0
            ? data.diagnostic_package_id_female
            : null,
        ...locationFields,
        slot_duration: data.slot_duration,
        start_date: data.start_date,
        end_date: data.end_date,
        healthians_zone_id: data.healthians_zone_id?.trim() || null,
        external_camp_id: data.external_camp_id ?? null,
        blood_collection_type: data.blood_collection_type || null,
        consultation_mode: data.consultation_mode || null,
        create_profile_on_metsights: Boolean(data.create_profile_on_metsights),
        enroll_for_fitprint_full: Boolean(data.enroll_for_fitprint_full),
        load_prev_assessment_questionnaires: Boolean(data.load_prev_assessment_questionnaires),
        load_prev_questionnaire_category_keys: data.load_prev_questionnaire_category_keys ?? null,
        notifications: data.notifications ?? [],
        slot_detail: data.slot_detail ?? null,
      };

      if (orgId && nextCampNo != null && currentCampNo !== nextCampNo) {
        setCampNoConfirm({
          payload,
          currentCampNo,
          nextCampNo,
        });
        return;
      }

      await performEngagementUpdate(engagement.engagement_id, {
        ...payload,
        camp_no: nextCampNo,
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCampNoUpdate = async (includeCampNo: boolean) => {
    if (!engagement || !campNoConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await performEngagementUpdate(engagement.engagement_id, {
        ...campNoConfirm.payload,
        camp_no: includeCampNo ? campNoConfirm.nextCampNo : campNoConfirm.currentCampNo,
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
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
                onClick={() => navigate(syncLogsTo)}
                variant="secondary"
              />
            </PermissionGate>
          ) : null}
        </PageHeaderActions>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50">
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
                  onOpenProgress={() => setTab("progress")}
                  setupVerified={
                    progressSnapshot?.engagement_setup?.engagement_setup?.status === "complete"
                  }
                  phleboGuideSent={
                    progressSnapshot?.engagement_setup?.booking_guide_phlebo?.status === "complete"
                  }
                  progressBottlenecks={progressSnapshot?.summary.bottlenecks}
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
                />
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <div className="text-xs font-medium text-zinc-500 mb-1">Notification health</div>
                  <p className="text-sm text-zinc-600">
                    Review configured events and dispatch logs for failed WhatsApp or email sends.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("notifications")}
                    className="mt-2 text-sm font-medium text-zinc-900 underline"
                  >
                    Open notifications tab
                  </button>
                  <span className="text-zinc-400 mx-2">·</span>
                  <Link
                    to="/notifications/notifications"
                    className="text-sm font-medium text-zinc-900 underline"
                  >
                    Global notification log
                  </Link>
                </div>
              </div>
            ) : null}

            {resolvedTab === "progress" ? (
              <EngagementProgressTab engagementId={engagement.engagement_id} />
            ) : null}

            {resolvedTab === "participants" ? (
              <EngagementParticipantsPanel
                engagementId={engagement.engagement_id}
                engagementName={engagement.engagement_name ?? engagement.engagement_code ?? undefined}
              />
            ) : null}

            {resolvedTab === "notifications" ? (
              <EngagementNotificationsTab
                engagement={engagement}
                notificationServiceLabel={notificationServiceLabel}
              />
            ) : null}

            {resolvedTab === "operations" ? (
              <EngagementOperationsPanel
                engagement={engagement}
                active={true}
                onEngagementUpdated={() => void loadEngagement()}
              />
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
          <ParticipantsModal
            open={participantsOpen}
            onClose={() => setParticipantsOpen(false)}
            source={{
              kind: "engagement-id",
              engagementId: engagement.engagement_id,
              name: engagement.engagement_name ?? engagement.engagement_code ?? undefined,
            }}
          />
          {formData ? (
            <EngagementFormModal
              open={editOpen}
              mode="edit"
              engagementId={engagement.engagement_id}
              initialData={formData}
              organizations={organizations}
              assessmentPackages={assessmentPackages}
              diagnosticPackages={diagnosticPackages}
              notificationServices={notificationServices}
              submitting={submitting}
              onClose={() => setEditOpen(false)}
              onSubmit={(data) => void handleSubmit(data)}
            />
          ) : null}
          <Modal
            open={!!campNoConfirm}
            onClose={() => {
              if (!submitting) setCampNoConfirm(null);
            }}
            title="Camp number will change"
            maxWidthClassName="max-w-md"
          >
            {campNoConfirm ? (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-600">
                  Updating organisation or start date would change camp_no from{" "}
                  <span className="font-medium text-zinc-900">
                    {campNoConfirm.currentCampNo ?? "—"}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-zinc-900">
                    {campNoConfirm.nextCampNo ?? "—"}
                  </span>
                  .
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void confirmCampNoUpdate(true)}
                    className="px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Update camp no
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void confirmCampNoUpdate(false)}
                    className="px-3 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 disabled:opacity-50"
                  >
                    Keep current camp no
                  </button>
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      ) : null}
    </div>
  );
}
