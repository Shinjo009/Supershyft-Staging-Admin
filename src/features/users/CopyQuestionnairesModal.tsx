import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import { getApiError, participantJourneyApi, type ParticipantJourneyInstanceSummary } from "../../lib/api";
import {
  countCompleteMetsightsCategories,
  formatJourneyStatusLabel,
} from "./participantJourneyUtils";

type CopyQuestionnairesModalProps = {
  open: boolean;
  onClose: () => void;
  userId: number;
  destination: ParticipantJourneyInstanceSummary | null;
  candidates: ParticipantJourneyInstanceSummary[];
  onSuccess: (message: string) => void;
};

export function CopyQuestionnairesModal({
  open,
  onClose,
  userId,
  destination,
  candidates,
  onSuccess,
}: CopyQuestionnairesModalProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedSourceId(candidates[0]?.assessment_instance_id ?? null);
    setError(null);
    setSubmitting(false);
  }, [open, candidates]);

  const destLabel = destination
    ? `${destination.package_display_name || destination.package_code || "Assessment"} · ${
        destination.engagement_name || destination.engagement_code || "Engagement"
      } (#${destination.assessment_instance_id})`
    : "";

  const handleConfirm = async () => {
    if (!destination || selectedSourceId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await participantJourneyApi.copyQuestionnaires(
        userId,
        destination.assessment_instance_id,
        { source_assessment_instance_id: selectedSourceId },
      );
      const copied = res.data.data.copied_count;
      onSuccess(
        copied > 0
          ? `Copied ${copied} answer${copied === 1 ? "" : "s"} from assessment #${selectedSourceId}.`
          : "No new answers were copied (destination may already have those responses).",
      );
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Copy questionnaires from another assessment" maxWidthClassName="max-w-lg">
      <div className="space-y-4 text-sm">
        <p className="text-zinc-600">
          Copy into <span className="font-medium text-zinc-900">{destLabel}</span>. Only categories that are
          incomplete on the destination and have data on the source are copied.
        </p>

        {candidates.length === 0 ? (
          <p className="text-zinc-500 italic">No other assessments with questionnaire answers are available.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {candidates.map((row) => {
              const selected = selectedSourceId === row.assessment_instance_id;
              const completeCats = countCompleteMetsightsCategories(row);
              return (
                <li key={row.assessment_instance_id}>
                  <label
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                      selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="copy-source"
                      className="mt-1"
                      checked={selected}
                      onChange={() => setSelectedSourceId(row.assessment_instance_id)}
                      disabled={submitting}
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block font-medium text-zinc-900">
                        {row.package_display_name || row.package_code || `Package #${row.package_id}`}
                        <span className="text-zinc-400 font-normal"> #{row.assessment_instance_id}</span>
                      </span>
                      <span className="block text-xs text-zinc-500 truncate">
                        {row.engagement_name || row.engagement_code || `Engagement #${row.engagement_id}`}
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-600">
                        <span className="capitalize">Status: {formatJourneyStatusLabel(row.status)}</span>
                        <span>{row.questionnaire?.response_count ?? 0} answers</span>
                        <span>{row.questionnaire?.categories_touched ?? 0} categories touched</span>
                        <span>{completeCats} Metsights categories complete</span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting || selectedSourceId === null || candidates.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "Copying…" : "Copy answers"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
