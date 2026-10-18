import { Loader2 } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import type { CampConsultationParticipantItem } from "../../lib/api";

export function CampConsultationDirectRequestConfirmDialog({
  open,
  onClose,
  participant,
  loading,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  participant: CampConsultationParticipantItem | null;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  const participantName = participant
    ? [participant.first_name, participant.last_name].filter(Boolean).join(" ") || "Participant"
    : "";

  return (
    <Modal open={open} onClose={onClose} title="Ask request" maxWidthClassName="max-w-md">
      {participant ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Mark <span className="font-medium text-zinc-900">{participantName}</span> as having
            requested a consultation? Health data consent will not be recorded and no OTP will be sent.
          </p>
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming…
                </span>
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
