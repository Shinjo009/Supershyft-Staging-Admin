import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import {
  EngagementFormWizard,
  type EngagementFormStepKey,
} from "./EngagementFormModal";
import {
  buildDefaultEngagementCreate,
  engagementToFormData,
} from "./engagementFormData";
import {
  buildEngagementCreatePayload,
  buildEngagementUpdatePayload,
} from "./engagementFormSubmit";
import {
  engagementsApi,
  getApiError,
  type AssessmentPackage,
  type DiagnosticPackageBootstrapOption,
  type Engagement,
  type EngagementCreate,
  type NotificationServiceItem,
  type OrganizationListItem,
} from "../../lib/api";

const STEP_KEYS: EngagementFormStepKey[] = [
  "basics",
  "location",
  "offerings",
  "schedule",
  "notifications",
];

function parseStepKey(raw: string | null): EngagementFormStepKey | undefined {
  if (!raw) return undefined;
  return STEP_KEYS.includes(raw as EngagementFormStepKey)
    ? (raw as EngagementFormStepKey)
    : undefined;
}

type FormPageMode = "add" | "edit";

export function EngagementFormPage({ mode }: { mode: FormPageMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { engagementCode } = useParams<{ engagementCode: string }>();
  const [searchParams] = useSearchParams();
  const initialStepKey = parseStepKey(searchParams.get("step"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [formData, setFormData] = useState<EngagementCreate | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [assessmentPackages, setAssessmentPackages] = useState<AssessmentPackage[]>([]);
  const [diagnosticPackages, setDiagnosticPackages] = useState<DiagnosticPackageBootstrapOption[]>([]);
  const [notificationServices, setNotificationServices] = useState<NotificationServiceItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [campNoConfirm, setCampNoConfirm] = useState<{
    payload: Record<string, unknown>;
    currentCampNo: number | null;
    nextCampNo: number | null;
    engagementCode: string;
    onDeferredSuccess?: () => void;
  } | null>(null);

  const backTo = useMemo(() => {
    if (mode === "edit" && engagementCode) {
      return `/engagements/${encodeURIComponent(engagementCode)}`;
    }
    return "/engagements";
  }, [mode, engagementCode]);

  const headerConfig = useMemo(() => {
    if (mode === "add") {
      return { title: "New engagement", subtitle: "Create camp configuration", backTo: "/engagements" };
    }
    const name = engagement?.engagement_name || engagementCode || "Engagement";
    return {
      title: `Edit · ${name}`,
      subtitle: engagement?.engagement_code ?? undefined,
      backTo,
    };
  }, [mode, engagement, engagementCode, backTo]);

  usePageHeader(headerConfig);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrapRes = await engagementsApi.formBootstrap();
      const bootstrap = bootstrapRes.data.data;
      setOrganizations(bootstrap.organizations ?? []);
      setAssessmentPackages(bootstrap.assessment_packages ?? []);
      setDiagnosticPackages(bootstrap.diagnostic_packages ?? []);
      setNotificationServices(bootstrap.notification_services ?? []);

      if (mode === "add") {
        setEngagement(null);
        const preset = (location.state as { createPreset?: Partial<EngagementCreate> } | null)
          ?.createPreset;
        setFormData(
          buildDefaultEngagementCreate(preset, {
            organizations: bootstrap.organizations,
            assessment_packages: bootstrap.assessment_packages,
          }),
        );
        return;
      }

      const code = (engagementCode ?? "").trim();
      if (!code) {
        setError("Missing engagement code");
        return;
      }
      const engRes = await engagementsApi.getByCode(code);
      const detail = engRes.data.data;
      setEngagement(detail);
      setFormData(engagementToFormData(detail));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [mode, engagementCode, location.state]);

  useEffect(() => {
    void load();
  }, [load]);

  const performUpdate = async (
    engagementId: number,
    payload: Record<string, unknown>,
    code: string,
    options?: { navigateAway?: boolean },
  ) => {
    await engagementsApi.update(engagementId, payload as never);
    setCampNoConfirm(null);
    if (options?.navigateAway !== false) {
      navigate(`/engagements/${encodeURIComponent(code)}`);
      return;
    }
    if (mode === "edit") {
      const engRes = await engagementsApi.getByCode(code);
      setEngagement(engRes.data.data);
      setFormData(engagementToFormData(engRes.data.data));
    }
  };

  const handleSubmit = async (data: EngagementCreate) => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "add") {
        const createPayload = buildEngagementCreatePayload(data);
        const created = await engagementsApi.create(createPayload);
        const createdRow = created.data.data as { engagement_id: number; engagement_code?: string };
        const code = (createdRow.engagement_code ?? "").trim();
        if (code) {
          navigate(`/engagements/${encodeURIComponent(code)}?tab=assistants`);
        } else {
          navigate("/engagements");
        }
        return;
      }

      if (!engagement) return;
      const { payload, nextCampNo } = buildEngagementUpdatePayload(data);
      const currentCampNo = engagement.camp_no ?? null;
      const code = (engagement.engagement_code ?? engagementCode ?? "").trim();
      if (payload.organization_id && nextCampNo != null && currentCampNo !== nextCampNo) {
        setCampNoConfirm({
          payload,
          currentCampNo,
          nextCampNo,
          engagementCode: code,
        });
        return;
      }
      await performUpdate(engagement.engagement_id, { ...payload, camp_no: nextCampNo }, code, {
        navigateAway: true,
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndContinue = async (
    data: EngagementCreate,
    helpers: { onDeferredSuccess: () => void },
  ): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "add") {
        const createPayload = buildEngagementCreatePayload(data);
        const created = await engagementsApi.create(createPayload);
        const createdRow = created.data.data as { engagement_id: number; engagement_code?: string };
        const code = (createdRow.engagement_code ?? "").trim();
        if (code) {
          navigate(`/engagements/${encodeURIComponent(code)}/edit?step=location`);
        } else {
          navigate("/engagements");
        }
        return true;
      }

      if (!engagement) return false;
      const { payload, nextCampNo } = buildEngagementUpdatePayload(data);
      const currentCampNo = engagement.camp_no ?? null;
      const code = (engagement.engagement_code ?? engagementCode ?? "").trim();
      if (payload.organization_id && nextCampNo != null && currentCampNo !== nextCampNo) {
        setCampNoConfirm({
          payload,
          currentCampNo,
          nextCampNo,
          engagementCode: code,
          onDeferredSuccess: helpers.onDeferredSuccess,
        });
        return false;
      }
      await performUpdate(engagement.engagement_id, { ...payload, camp_no: nextCampNo }, code, {
        navigateAway: false,
      });
      return true;
    } catch (err) {
      setError(getApiError(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCampNoUpdate = async (includeCampNo: boolean) => {
    if (!engagement || !campNoConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      const deferred = campNoConfirm.onDeferredSuccess;
      const navigateAway = !deferred;
      await performUpdate(
        engagement.engagement_id,
        {
          ...campNoConfirm.payload,
          camp_no: includeCampNo ? campNoConfirm.nextCampNo : campNoConfirm.currentCampNo,
        },
        campNoConfirm.engagementCode,
        { navigateAway },
      );
      deferred?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-4 text-sm text-zinc-600">
        {error ?? "Could not load form."}{" "}
        <Link to={backTo} className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      {error ? (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      <EngagementFormWizard
        variant="page"
        open
        initialStepKey={initialStepKey}
        mode={mode}
        engagementId={engagement?.engagement_id ?? null}
        initialData={formData}
        organizations={organizations}
        assessmentPackages={assessmentPackages}
        diagnosticPackages={diagnosticPackages}
        notificationServices={notificationServices}
        submitting={submitting}
        onClose={() => navigate(backTo)}
        onSubmit={(data) => void handleSubmit(data)}
        onSaveAndContinue={handleSaveAndContinue}
      />

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
    </div>
  );
}
