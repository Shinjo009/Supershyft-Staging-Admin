import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import { engagementAssessmentPackagesApi, getApiError, type ParticipantJourneyInstanceSummary } from "../../lib/api";
import { pushCategoriesForTypeCode } from "../engagements/engagementOperationsUtils";

type PushToMetsightsModalProps = {
  open: boolean;
  onClose: () => void;
  row: ParticipantJourneyInstanceSummary | null;
  onSuccess: (message: string) => void;
};

export function PushToMetsightsModal({ open, onClose, row, onSuccess }: PushToMetsightsModalProps) {
  const categoryOptions = pushCategoriesForTypeCode(row?.assessment_type_code);
  const [selected, setSelected] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setSelected(pushCategoriesForTypeCode(row.assessment_type_code).map((c) => c.key));
    setError(null);
    setPushing(false);
  }, [open, row?.assessment_instance_id, row?.assessment_type_code]);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handlePush = async () => {
    if (!row || selected.length === 0) return;
    setPushing(true);
    setError(null);
    try {
      const res = await engagementAssessmentPackagesApi.pushQuestionnaires(
        row.engagement_id,
        row.package_id,
        row.assessment_instance_id,
        selected,
      );
      const d = res.data.data;
      const parts = [
        `Pushed: ${d.pushed ?? 0}`,
        `Skipped: ${d.skipped ?? 0}`,
        (d.errors ?? 0) > 0 ? `Errors: ${d.errors}` : null,
      ].filter(Boolean);
      onSuccess(parts.join(" · "));
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setPushing(false);
    }
  };

  const rowLabel = row
    ? `${row.package_display_name || row.package_code} (#${row.assessment_instance_id})`
    : "";

  return (
    <Modal open={open} onClose={() => !pushing && onClose()} title="Push to MetSights" maxWidthClassName="max-w-md">
      <div className="space-y-4 text-sm">
        <p className="text-zinc-600">
          Push questionnaire answers from <span className="font-medium text-zinc-900">{rowLabel}</span> to the
          linked MetSights record.
        </p>

        {categoryOptions.length === 0 ? (
          <p className="text-zinc-500 italic">This assessment type has no pushable Metsights categories.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-700">Categories</p>
            <ul className="space-y-1.5">
              {categoryOptions.map((cat) => (
                <li key={cat.key}>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-800">
                    <input
                      type="checkbox"
                      checked={selected.includes(cat.key)}
                      onChange={() => toggle(cat.key)}
                      disabled={pushing}
                    />
                    {cat.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pushing}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handlePush()}
            disabled={pushing || selected.length === 0 || categoryOptions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pushing ? "Pushing…" : "Push"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
