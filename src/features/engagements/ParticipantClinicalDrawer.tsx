import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
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
import { participantCategoryMaps, ReportUrlCell } from "./participantRosterUi";

type Tab = "blood" | "bio_ai" | "questionnaires";

export function ParticipantClinicalDrawer({
  open,
  onClose,
  engagementId,
  participant,
  questionnaireColumns,
}: {
  open: boolean;
  onClose: () => void;
  engagementId: number;
  participant: Participant | null;
  questionnaireColumns?: {
    metsights: RosterQuestionnaireColumn[];
    supershyft: RosterQuestionnaireColumn[];
  };
}) {
  const [tab, setTab] = useState<Tab>("blood");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ParticipantClinicalSnapshot | null>(null);

  useEffect(() => {
    if (!open || !participant) {
      setSnapshot(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    void participantsApi
      .clinicalSnapshot(engagementId, participant.user_id)
      .then((res) => setSnapshot(res.data.data))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [open, participant, engagementId]);

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

        <div className="flex gap-1 px-4 pt-3 border-b border-zinc-100">
          {(["blood", "bio_ai", "questionnaires"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg ${
                tab === t ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t === "blood" ? "Blood" : t === "bio_ai" ? "Bio AI" : "Questionnaires"}
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
          {!loading && !error && snapshot && tab === "blood" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  Report <CompletenessFlagIcon present={snapshot.blood.has_blood_report} label="Blood report" />
                </span>
                <span className="inline-flex items-center gap-1">
                  Values <CompletenessFlagIcon present={snapshot.blood.has_blood_values} label="Blood values" />
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Report URL</div>
                <ReportUrlCell url={snapshot.blood.blood_report_url} label="Blood report" />
              </div>
              {snapshot.blood.blood_bookings.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">Collections</div>
                  <ul className="space-y-2 text-xs text-zinc-700">
                    {snapshot.blood.blood_bookings.map((bb) => (
                      <li key={bb.id ?? bb.booking_id} className="rounded border border-zinc-200 p-2">
                        <div>Booking: {bb.booking_id || "—"}</div>
                        <div>Collected: {bb.collected_at || "—"}</div>
                        {bb.diagnostic_report_url ? (
                          <ReportUrlCell url={bb.diagnostic_report_url} label="Diagnostic report" />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!loading && !error && snapshot && tab === "bio_ai" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1">
                  Report <CompletenessFlagIcon present={snapshot.bio_ai.has_bio_ai_report} label="Bio AI report" />
                </span>
                <span className="inline-flex items-center gap-1">
                  JSON <CompletenessFlagIcon present={snapshot.bio_ai.has_bio_ai_json} label="Bio AI JSON" />
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Report URL</div>
                <ReportUrlCell url={snapshot.bio_ai.bio_ai_report_url} label="Bio AI report" />
              </div>
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
