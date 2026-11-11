import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
} from "lucide-react";
import type {
  AssessmentPackage,
  ChecklistReadiness,
  DiagnosticPackageBootstrapOption,
  Engagement,
  EngagementDataCompletenessResponse,
  EngagementNotificationItem,
} from "../../lib/api";
import { normalizeNotificationServiceConfigs } from "../../shared/ui/NotificationEventServicesInput";
import {
  engagementDataCompletenessApi,
  engagementNotificationsApi,
  getApiError,
} from "../../lib/api";
import { CampOverviewSection } from "./CampOverviewSection";
import { ConsoleUrlActions } from "./consoleUrlActions";
import { EngagementBookingSummaryCards } from "./EngagementBookingSummary";
import {
  formatBloodCollectionLabel,
  formatConsultationModeLabel,
  summarizeSlotDetail,
} from "./engagementTypeConfig";
import { Field, formatEngagementStatusLabel, isB2BEngagement } from "./engagementViewShared";

type SharedProps = {
  engagement: Engagement;
  orgName: string;
  assessmentPackages: AssessmentPackage[];
  diagnosticPackages: DiagnosticPackageBootstrapOption[];
  notificationServiceLabel: (serviceKey: string | null | undefined) => string;
};

type OverviewProps = SharedProps & {
  typeLabel?: string;
  onManageChecklists?: () => void;
};

export function EngagementOverviewTab({
  engagement,
  orgName,
  typeLabel,
  assessmentPackages,
  diagnosticPackages,
  onManageChecklists,
  notificationServiceLabel,
}: OverviewProps) {
  const b2b = isB2BEngagement(engagement.organization_id);
  const campCollection = engagement.blood_collection_type === "camp_collection";
  const [completeness, setCompleteness] = useState<EngagementDataCompletenessResponse | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(false);
  const [completenessError, setCompletenessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset the previous engagement snapshot before loading the new one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleteness(null);
    setCompletenessError(null);
    setCompletenessLoading(true);
    void engagementDataCompletenessApi
      .get(engagement.engagement_id)
      .then((res) => {
        if (!cancelled) setCompleteness(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setCompletenessError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setCompletenessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [engagement.engagement_id]);

  const coverageLine = useMemo(() => {
    if (!completeness || completeness.summary.total_participants === 0) return null;
    const s = completeness.summary;
    const bioValues = s.bio_ai_values ?? s.bio_ai_json;
    return [
      `Bookings ${s.with_booking_id}/${s.total_participants}`,
      `Blood report ${s.blood_report}/${s.total_participants}`,
      `Blood values ${s.blood_values}/${s.total_participants}`,
      `Bio AI report ${s.bio_ai_report}/${s.total_participants}`,
      `Bio AI values ${bioValues}/${s.total_participants}`,
      `Fitprint report ${s.fitprint_report ?? 0}/${s.total_participants}`,
      `Fitprint values ${s.fitprint_values ?? 0}/${s.total_participants}`,
      `Q ${s.questionnaire_filled}/${s.total_participants}`,
    ].join(" · ");
  }, [completeness]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <div className="text-xs font-medium text-zinc-500">At a glance</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <Field label="Status">{formatEngagementStatusLabel(engagement.status)}</Field>
          <Field label="Type">{typeLabel || engagement.engagement_type || "—"}</Field>
          <Field label="Organisation">{orgName}</Field>
          <Field label="City">{engagement.city ?? "—"}</Field>
          <Field label="Dates">
            {String(engagement.start_date ?? "—")} → {String(engagement.end_date ?? "—")}
          </Field>
          <Field label="Participants">{engagement.participant_count ?? 0}</Field>
          {b2b && engagement.camp_no != null ? (
            <Field label="Camp no">{String(engagement.camp_no)}</Field>
          ) : null}
          <Field label="Blood collection">{formatBloodCollectionLabel(engagement.blood_collection_type)}</Field>
          <Field label="Consultation mode">{formatConsultationModeLabel(engagement.consultation_mode)}</Field>
        </div>
      </div>

      {b2b && campCollection ? (
        <CampOverviewSection engagement={engagement} />
      ) : (
        <>
          <EngagementBookingSummaryCards engagementId={engagement.engagement_id} />
          {!b2b ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                {engagement.engagement_code ?? "—"}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                B2C
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                  (engagement.status ?? "").toLowerCase() === "running"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {formatEngagementStatusLabel(engagement.status)}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Data completeness</div>
              {completenessLoading ? (
                <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </div>
              ) : completenessError ? (
                <p className="text-xs text-red-600">{completenessError}</p>
              ) : coverageLine ? (
                <p className="text-xs text-zinc-700 tabular-nums">{coverageLine}</p>
              ) : (
                <p className="text-xs text-zinc-400">No participants enrolled yet.</p>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Console</div>
              <ConsoleUrlActions engagementId={engagement.engagement_id} />
            </div>
          </div>
          ) : null}
        </>
      )}

      {b2b ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500 mb-1">Data completeness</div>
          {completenessLoading ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading…
            </div>
          ) : completenessError ? (
            <p className="text-xs text-red-600">{completenessError}</p>
          ) : coverageLine ? (
            <p className="text-xs text-zinc-700 tabular-nums">{coverageLine}</p>
          ) : (
            <p className="text-xs text-zinc-400">No participants enrolled yet.</p>
          )}
          {!campCollection ? (
            <div className="mt-4">
              <div className="text-xs font-medium text-zinc-500 mb-1">Console</div>
              <ConsoleUrlActions engagementId={engagement.engagement_id} />
            </div>
          ) : null}
        </div>
      ) : null}

      <details className="bg-white border border-zinc-200 rounded-xl group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-900 flex items-center justify-between">
          View full configuration
          <ChevronRight className="w-4 h-4 text-zinc-400 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-4 pb-4 border-t border-zinc-100">
          <EngagementDetailsTab
            engagement={engagement}
            orgName={orgName}
            assessmentPackages={assessmentPackages}
            diagnosticPackages={diagnosticPackages}
            notificationServiceLabel={notificationServiceLabel}
            onManageChecklists={onManageChecklists}
          />
        </div>
      </details>
    </div>
  );
}

type DetailsProps = SharedProps & {
  onManageChecklists?: () => void;
};

export function EngagementDetailsTab({
  engagement,
  orgName,
  assessmentPackages,
  diagnosticPackages,
  onManageChecklists,
}: DetailsProps) {
  const b2b = isB2BEngagement(engagement.organization_id);
  const rd = (engagement as Engagement & { readiness?: ChecklistReadiness | null }).readiness;

  const assessmentName =
    assessmentPackages.find((p) => p.package_id === engagement.assessment_package_id)
      ?.display_name ??
    assessmentPackages.find((p) => p.package_id === engagement.assessment_package_id)
      ?.package_code ??
    (engagement.assessment_package_id != null ? String(engagement.assessment_package_id) : "—");

  const diagnosticName =
    diagnosticPackages.find(
      (p) => p.diagnostic_package_id === engagement.diagnostic_package_id
    )?.package_name ??
    (engagement.diagnostic_package_id != null
      ? String(engagement.diagnostic_package_id)
      : "—");
  const packageName = (packageId: number | null | undefined) =>
    diagnosticPackages.find((p) => p.diagnostic_package_id === packageId)?.package_name ??
    (packageId != null ? String(packageId) : "—");
  const splitPackages =
    engagement.diagnostic_package_id_male != null && engagement.diagnostic_package_id_female != null;

  const hasCoords =
    engagement.latitude != null &&
    engagement.longitude != null &&
    !Number.isNaN(Number(engagement.latitude)) &&
    !Number.isNaN(Number(engagement.longitude));

  const mapsUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${engagement.latitude}&mlon=${engagement.longitude}#map=17/${engagement.latitude}/${engagement.longitude}`
    : null;

  const scheduleSummary = summarizeSlotDetail(engagement.slot_detail);

  const copyCoords = async () => {
    if (!hasCoords) return;
    try {
      await navigator.clipboard.writeText(`${engagement.latitude}, ${engagement.longitude}`);
    } catch {
      // ignore clipboard errors
    }
  };

  const readinessEmpty = !rd || rd.total === 0;
  const readinessBody = readinessEmpty ? (
    <p className="text-sm text-zinc-500">—</p>
  ) : (
    <>
      <div className="text-sm font-medium text-zinc-900">
        {rd.done}/{rd.total} ({rd.percent}%)
      </div>
      <div className="mt-1 h-2 w-full bg-zinc-100 rounded overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded transition-all"
          style={{ width: `${rd.percent}%` }}
        />
      </div>
      {rd.percent === 100 ? (
        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-medium bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
          <Check className="w-3 h-3 shrink-0" />
          Ready
        </span>
      ) : null}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">Readiness</h3>
        {onManageChecklists ? (
          <button
            type="button"
            onClick={onManageChecklists}
            className="w-full text-left rounded-lg hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {readinessBody}
          </button>
        ) : (
          readinessBody
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">Location</h3>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <div className="space-y-1 min-w-0">
            <div className="font-medium text-zinc-900">
              {engagement.address || "No address set"}
            </div>
            <div className="text-zinc-600 text-sm">
              {[
                engagement.landmark,
                engagement.sub_locality,
                engagement.city,
                engagement.state,
                engagement.pincode,
                engagement.country,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Field label="Landmark">{engagement.landmark ?? "—"}</Field>
          <Field label="Sub locality">{engagement.sub_locality ?? "—"}</Field>
          <Field label="City">{engagement.city ?? "—"}</Field>
          <Field label="Pincode">{engagement.pincode ?? "—"}</Field>
          <Field label="State">{engagement.state ?? "—"}</Field>
          <Field label="Country">{engagement.country ?? "—"}</Field>
          <Field label="Latitude">{engagement.latitude ?? "—"}</Field>
          <Field label="Longitude">{engagement.longitude ?? "—"}</Field>
        </div>
        {hasCoords ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={mapsUrl!}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Maps
            </a>
            <button
              type="button"
              onClick={() => void copyCoords()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium"
            >
              Copy coordinates
            </button>
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">Schedule & packages</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {b2b ? <Field label="Organisation">{orgName}</Field> : null}
          <Field label="Metsights Engagement ID">
            {engagement.metsights_engagement_id ?? "—"}
          </Field>
          <Field label="Start">{String(engagement.start_date ?? "—")}</Field>
          <Field label="End">{String(engagement.end_date ?? "—")}</Field>
          <Field label="Blood collection">
            {formatBloodCollectionLabel(engagement.blood_collection_type)}
          </Field>
          {engagement.consultations &&
          Object.values(engagement.consultations).some(Boolean) ? (
            <Field label="Consultation mode">
              {formatConsultationModeLabel(engagement.consultation_mode)}
            </Field>
          ) : null}
          {engagement.external_camp_id != null ? (
            <Field label="Healthians Camp ID">{String(engagement.external_camp_id)}</Field>
          ) : null}
          {engagement.healthians_zone_id ? (
            <Field label="Healthians Zone ID">{engagement.healthians_zone_id}</Field>
          ) : null}
          <Field label="Slot duration">
            {engagement.slot_duration != null ? `${engagement.slot_duration} min` : "—"}
          </Field>
          <Field label="Assessment package">{assessmentName}</Field>
          {splitPackages ? (
            <>
              <Field label="Male diagnostic package">
                {packageName(engagement.diagnostic_package_id_male)}
              </Field>
              <Field label="Female diagnostic package">
                {packageName(engagement.diagnostic_package_id_female)}
              </Field>
            </>
          ) : (
            <Field label="Diagnostic package">{diagnosticName}</Field>
          )}
          <Field label="Create profile on Metsights">
            {engagement.create_profile_on_metsights ? "Yes" : "No"}
          </Field>
          <Field label="Enroll for FitPrint Full">
            {engagement.enroll_for_fitprint_full ? "Yes" : "No"}
          </Field>
          <Field label="Load previous assessment questionnaires">
            {engagement.load_prev_assessment_questionnaires ? "Yes" : "No"}
          </Field>
          {engagement.load_prev_assessment_questionnaires &&
            (engagement.load_prev_questionnaire_category_keys?.length ?? 0) > 0 && (
              <Field label="Load-prev categories">
                {(engagement.load_prev_questionnaire_category_keys ?? []).join(", ")}
              </Field>
            )}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">On-site schedule</h3>
        {scheduleSummary.bloodCabins + scheduleSummary.consultCabins === 0 ? (
          <p className="text-sm text-zinc-500">
            {engagement.blood_collection_type === "home_collection"
              ? "Home collection — slots are chosen per participant via Healthians."
              : "No on-site dates or cabins configured."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scheduleSummary.bloodDates > 0 && (
              <>
                <Field label="Blood test dates">{scheduleSummary.bloodDates}</Field>
                <Field label="Blood test cabins">{scheduleSummary.bloodCabins}</Field>
              </>
            )}
            {scheduleSummary.consultDates > 0 && (
              <>
                <Field label="Consultation dates">{scheduleSummary.consultDates}</Field>
                <Field label="Consultation cabins">{scheduleSummary.consultCabins}</Field>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EngagementNotificationsTab({
  engagement,
  notificationServiceLabel,
}: Pick<SharedProps, "engagement" | "notificationServiceLabel">) {
  const [loading, setLoading] = useState(true);
  const [defaultEventRows, setDefaultEventRows] = useState<
    { event_code: string; display_name: string }[]
  >([]);
  const [configuredNotifications, setConfiguredNotifications] = useState<
    EngagementNotificationItem[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const setupRes = await engagementNotificationsApi.getNotificationSetup(
          engagement.engagement_id
        );

        if (cancelled) return;

        const setup = Array.isArray(setupRes.data.data) ? setupRes.data.data : [];
        setDefaultEventRows(
          setup.map((item) => ({
            event_code: item.event_code,
            display_name: item.name ?? item.event_code,
          }))
        );
        setConfiguredNotifications(
          setup.map((item) => ({
            id: 0,
            engagement_id: engagement.engagement_id,
            event_code: item.event_code,
            notification_services:
              item.override_services?.length > 0 ? item.override_services : item.default_services,
            event_display_name: item.name,
          }))
        );
      } catch {
        if (!cancelled) {
          setDefaultEventRows([]);
          setConfiguredNotifications([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [engagement.engagement_id]);

  const servicesByEventCode = useMemo(() => {
    const map = new Map<string, ReturnType<typeof normalizeNotificationServiceConfigs>>();
    for (const item of configuredNotifications) {
      if (item.event_code) {
        map.set(item.event_code, normalizeNotificationServiceConfigs(item.notification_services));
      }
    }
    return map;
  }, [configuredNotifications]);

  const formatServices = (
    services: ReturnType<typeof normalizeNotificationServiceConfigs>
  ) =>
    services.length > 0
      ? services
          .map((item) => {
            const label = notificationServiceLabel(item.service_key);
            return item.external_link ? `${label} (${item.external_link})` : label;
          })
          .join(", ")
      : "—";

  const rows = useMemo(() => {
    if (defaultEventRows.length > 0) {
      return defaultEventRows.map((event) => ({
        key: event.event_code,
        label: event.display_name,
        services: servicesByEventCode.get(event.event_code) ?? [],
      }));
    }
    return configuredNotifications.map((item) => ({
      key: item.event_code,
      label: item.event_display_name ?? item.event_code,
      services: normalizeNotificationServiceConfigs(item.notification_services),
    }));
  }, [configuredNotifications, defaultEventRows, servicesByEventCode]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No applicable notification events for this engagement, or global defaults are not configured yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rows.map((row) => (
            <Field key={row.key} label={row.label}>
              {formatServices(row.services)}
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}
