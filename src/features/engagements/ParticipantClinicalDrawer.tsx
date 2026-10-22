import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getApiError,
  participantsApi,
  type Participant,
  type ParticipantClinicalSnapshot,
  type RosterQuestionnaireColumn,
} from "../../lib/api";
import { CompletenessFlagIcon } from "./engagementCompletenessUi";
import { METSIGHTS_CATEGORY_COLUMNS, OpsCategoryIcon, OpsLegend } from "./engagementOpsQuestionnaireUi";
import {
  participantCategoryMaps,
  ReportUrlCell,
  resolveParticipantBloodReportUrl,
} from "./participantRosterUi";

type Tab = "blood" | "bio_ai" | "fitprint" | "questionnaires";

function isPermanentBioAiReportUrl(url: string | null | undefined): boolean {
  const cleaned = (url || "").trim();
  if (!cleaned) return false;
  return cleaned.includes("bio-ai-reports") && cleaned.includes("/r/");
}

function bioAiValuesPresent(
  snapshot: ParticipantClinicalSnapshot | null,
  participant: Participant
): boolean {
  return Boolean(
    snapshot?.bio_ai.has_bio_ai_values ??
      snapshot?.bio_ai.has_bio_ai_json ??
      participant.has_bio_ai_values ??
      participant.has_bio_ai_json
  );
}

export function ParticipantClinicalDrawer({
  open,
  onClose,
  engagementId,
  participant,
  questionnaireColumns,
  canClearClinicalData = false,
  onParticipantUpdated,
}: {
  open: boolean;
  onClose: () => void;
  engagementId: number;
  participant: Participant | null;
  questionnaireColumns?: {
    metsights: RosterQuestionnaireColumn[];
    supershyft: RosterQuestionnaireColumn[];
  };
  canClearClinicalData?: boolean;
  onParticipantUpdated?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("blood");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ParticipantClinicalSnapshot | null>(null);

  const loadSnapshot = useCallback(() => {
    if (!participant) return;
    setLoading(true);
    setError(null);
    void participantsApi
      .clinicalSnapshot(engagementId, participant.user_id)
      .then((res) => setSnapshot(res.data.data))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [engagementId, participant]);

  useEffect(() => {
    if (!open || !participant) {
      setSnapshot(null);
      setError(null);
      return;
    }
    loadSnapshot();
  }, [open, participant, loadSnapshot]);

  const handleClear = async (
    product: "blood" | "bio_ai" | "fitprint",
    field: "report_url" | "values",
    label: string
  ) => {
    if (!participant || !canClearClinicalData) return;
    const ok = window.confirm(
      `Delete ${label} for this participant? This cannot be undone from the admin UI.`
    );
    if (!ok) return;
    setClearing(true);
    setError(null);
    try {
      const res = await participantsApi.clearClinicalData(engagementId, participant.user_id, {
        product,
        field,
      });
      setSnapshot(res.data.data);
      onParticipantUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setClearing(false);
    }
  };

  const handleRegenerateBioAi = async () => {
    if (!participant || !canClearClinicalData) return;
    const ok = window.confirm(
      "Regenerate the Bio AI PDF at the same link using this camp's latest MetSights data? The public URL will not change."
    );
    if (!ok) return;
    setClearing(true);
    setError(null);
    try {
      const res = await participantsApi.regenerateBioaiReport(engagementId, participant.user_id);
      setSnapshot(res.data.data);
      onParticipantUpdated?.();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setClearing(false);
    }
  };

  const activeParticipant = participant;
  const bloodReportUrl = (() => {
    if (!activeParticipant) return null;
    if (snapshot?.blood.blood_report_url?.trim()) {
      return snapshot.blood.blood_report_url.trim();
    }
    for (const bb of snapshot?.blood.blood_bookings ?? []) {
      const u = bb.diagnostic_report_url?.trim();
      if (u) return u;
    }
    return resolveParticipantBloodReportUrl(activeParticipant);
  })();
  const bioAiReportUrl =
    snapshot?.bio_ai.bio_ai_report_url?.trim() || activeParticipant?.bio_ai_report_url?.trim() || null;
  const fitprintReportUrl =
    snapshot?.fitprint?.fitprint_report_url?.trim() ||
    activeParticipant?.fitprint_report_url?.trim() ||
    null;
  const bioAiReports = snapshot?.bio_ai.reports ?? null;
  const fitprintReports = snapshot?.fitprint?.reports ?? null;
  const hasBioValues = activeParticipant ? bioAiValuesPresent(snapshot, activeParticipant) : false;
  const hasFitprintValues = Boolean(
    snapshot?.fitprint?.has_fitprint_values ?? activeParticipant?.has_fitprint_values
  );
  const hasBloodReportRaw = Boolean(
    snapshot?.blood.has_blood_report_raw ?? activeParticipant?.has_blood_report_raw
  );
  const hasBloodReport = Boolean(
    snapshot?.blood.has_blood_report ??
      activeParticipant?.has_blood_report ??
      snapshot?.blood.has_blood_values ??
      activeParticipant?.has_blood_values
  );
  const bloodReportRawJson = snapshot?.blood.blood_report_raw ?? null;
  const bloodReportJson = snapshot?.blood.blood_parameters ?? null;

  if (!open || !participant) {
    return null;
  }

  const name = [participant.first_name, participant.last_name].filter(Boolean).join(" ") || "Participant";
  const cols = snapshot?.questionnaire_columns ?? questionnaireColumns;
  const metsightsCols = cols?.metsights?.length
    ? cols.metsights
    : METSIGHTS_CATEGORY_COLUMNS.map((c) => ({ ...c, category_of: "metsights" as const }));
  const supershyftCols = cols?.supershyft ?? [];
  const maps = snapshot
    ? snapshot.questionnaires.categories
    : participantCategoryMaps(participant);

  const tabs: { id: Tab; label: string }[] = [
    { id: "blood", label: "Blood" },
    { id: "bio_ai", label: "Bio AI" },
    { id: "fitprint", label: "Fitprint" },
    { id: "questionnaires", label: "Questionnaires" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white shadow-xl flex flex-col max-h-full">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Clinical details</h2>
            <p className="text-sm text-zinc-600">{name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-zinc-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap ${
                tab === t.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
          {loading && (
            <div className="flex items-center gap-2 text-zinc-500 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading…
            </div>
          )}
          {!loading && error && <p className="text-red-600">{error}</p>}
          {!loading && !error && tab === "blood" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  Blood report raw{" "}
                  <CompletenessFlagIcon present={hasBloodReportRaw} label="Blood report raw" />
                </span>
                <span className="inline-flex items-center gap-1">
                  Blood report{" "}
                  <CompletenessFlagIcon present={hasBloodReport} label="Blood report" />
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Report URL</div>
                <ReportUrlCell url={bloodReportUrl} label="Blood report" />
              </div>
              {canClearClinicalData && (
                <ClinicalAdminActions
                  clearing={clearing}
                  hasReportUrl={Boolean(bloodReportUrl)}
                  hasValues={Boolean(snapshot?.blood.has_blood_values ?? participant.has_blood_values)}
                  onClearReportUrl={() => void handleClear("blood", "report_url", "blood report URL")}
                  onClearValues={() => void handleClear("blood", "values", "blood report data")}
                />
              )}
              {hasBloodReportRaw && bloodReportRawJson && (
                <ClinicalJsonPanel title="Blood report raw (JSON)" value={bloodReportRawJson} />
              )}
              {hasBloodReport && bloodReportJson && (
                <ClinicalJsonPanel title="Blood report (JSON)" value={bloodReportJson} />
              )}
              {hasBloodReport && !bloodReportJson && !loading && (
                <p className="text-xs text-zinc-500">
                  Report is on file (PDF URL or collection data). Open Participant Journey for full detail.
                </p>
              )}
              {(snapshot?.blood.blood_bookings.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">Collections</div>
                  <ul className="space-y-2 text-xs text-zinc-700">
                    {(snapshot?.blood.blood_bookings ?? []).map((bb) => (
                      <li key={bb.id ?? bb.booking_id} className="rounded border border-zinc-200 p-2 space-y-1">
                        <div>Booking: {bb.booking_id || "—"}</div>
                        <div>Collected: {bb.collected_at || "—"}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-zinc-500">Diagnostic URL:</span>
                          <ReportUrlCell url={bb.diagnostic_report_url} label="Diagnostic report" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!loading && !error && tab === "bio_ai" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  Report{" "}
                  <CompletenessFlagIcon
                    present={Boolean(snapshot?.bio_ai.has_bio_ai_report ?? participant.has_bio_ai_report)}
                    label="Bio AI report"
                  />
                </span>
                <span className="inline-flex items-center gap-1">
                  Values <CompletenessFlagIcon present={hasBioValues} label="Bio AI values" />
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Report URL</div>
                <ReportUrlCell url={bioAiReportUrl} label="Bio AI report" />
              </div>
              {canClearClinicalData && (
                <ClinicalAdminActions
                  clearing={clearing}
                  hasReportUrl={Boolean(bioAiReportUrl)}
                  hasValues={hasBioValues}
                  onClearReportUrl={() => void handleClear("bio_ai", "report_url", "Bio AI report URL")}
                  onClearValues={() => void handleClear("bio_ai", "values", "Bio AI values")}
                  onRegenerate={
                    isPermanentBioAiReportUrl(bioAiReportUrl)
                      ? () => void handleRegenerateBioAi()
                      : undefined
                  }
                />
              )}
              {hasBioValues && bioAiReports && (
                <ClinicalJsonPanel title="Bio AI values (JSON)" value={bioAiReports} />
              )}
              {hasBioValues && !bioAiReports && !loading && (
                <p className="text-xs text-zinc-500">
                  Values are on file; open Participant Journey for answer-level detail.
                </p>
              )}
            </div>
          )}
          {!loading && !error && tab === "fitprint" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  Report{" "}
                  <CompletenessFlagIcon
                    present={Boolean(snapshot?.fitprint?.has_fitprint_report ?? participant.has_fitprint_report)}
                    label="Fitprint report"
                  />
                </span>
                <span className="inline-flex items-center gap-1">
                  Values <CompletenessFlagIcon present={hasFitprintValues} label="Fitprint values" />
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Report URL</div>
                <ReportUrlCell url={fitprintReportUrl} label="Fitprint report" />
              </div>
              {canClearClinicalData && (
                <ClinicalAdminActions
                  clearing={clearing}
                  hasReportUrl={Boolean(fitprintReportUrl)}
                  hasValues={hasFitprintValues}
                  onClearReportUrl={() => void handleClear("fitprint", "report_url", "Fitprint report URL")}
                  onClearValues={() => void handleClear("fitprint", "values", "Fitprint values")}
                />
              )}
              {hasFitprintValues && fitprintReports && (
                <ClinicalJsonPanel title="Fitprint values (JSON)" value={fitprintReports} />
              )}
              {hasFitprintValues && !fitprintReports && !loading && (
                <p className="text-xs text-zinc-500">
                  Values are on file; open Participant Journey for answer-level detail.
                </p>
              )}
            </div>
          )}
          {!loading && !error && snapshot && tab === "questionnaires" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 capitalize">
                Overall: {snapshot.questionnaires.questionnaire_state.replace(/_/g, " ")}
              </p>
              <OpsLegend />
              {metsightsCols.length > 0 && (
                <CategoryTable title="MetSights" columns={metsightsCols} bucket={maps.metsights ?? {}} />
              )}
              {supershyftCols.length > 0 && (
                <CategoryTable title="SuperShyft" columns={supershyftCols} bucket={maps.supershyft ?? {}} />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-3">
          <Link
            to={`/users/${participant.user_id}/participant-journey`}
            className="text-sm font-medium text-sky-700 hover:underline"
            onClick={onClose}
          >
            Open Participant Journey
          </Link>
        </div>
      </aside>
    </div>
  );
}

function ClinicalAdminActions({
  clearing,
  hasReportUrl,
  hasValues,
  onClearReportUrl,
  onClearValues,
  onRegenerate,
}: {
  clearing: boolean;
  hasReportUrl: boolean;
  hasValues: boolean;
  onClearReportUrl: () => void;
  onClearValues: () => void;
  onRegenerate?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {onRegenerate && (
        <button
          type="button"
          disabled={clearing || !hasReportUrl}
          onClick={onRegenerate}
          className="text-xs text-sky-800 border border-sky-200 rounded px-2 py-1 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Regenerate report (same link)
        </button>
      )}
      <button
        type="button"
        disabled={clearing || !hasReportUrl}
        onClick={onClearReportUrl}
        className="text-xs text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete report URL
      </button>
      <button
        type="button"
        disabled={clearing || !hasValues}
        onClick={onClearValues}
        className="text-xs text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete values
      </button>
    </div>
  );
}

function ClinicalJsonPanel({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | unknown[];
}) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const sizeLabel = Array.isArray(value)
    ? `${value.length} items`
    : `${Object.keys(value).length} keys`;
  return (
    <div className="rounded border border-zinc-200">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
        <span className="text-zinc-400 font-normal">({sizeLabel})</span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 p-2">
          <button
            type="button"
            className="mb-2 text-xs text-sky-700 hover:underline"
            onClick={() => void navigator.clipboard?.writeText(text)}
          >
            Copy JSON
          </button>
          <pre className="max-h-64 overflow-auto rounded bg-zinc-50 p-2 text-[10px] leading-snug text-zinc-800">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}

function CategoryTable({
  title,
  columns,
  bucket,
}: {
  title: string;
  columns: RosterQuestionnaireColumn[];
  bucket: Record<string, import("../../lib/api").EngagementQuestionnaireCategoryStatus | undefined>;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-600 mb-1">{title}</div>
      <div className="overflow-x-auto rounded border border-zinc-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              {columns.map((col) => (
                <th key={col.key} className="px-1 py-1.5 text-center font-medium text-zinc-500 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((col) => (
                <td key={col.key} className="px-1 py-1.5 text-center">
                  <OpsCategoryIcon cat={bucket[col.key]} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
