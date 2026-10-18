import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import {
  expertsPortalApi,
  getApiError,
  type CampConsultationParticipantItem,
  type CampConsultationRequestConsent,
} from "../../lib/api";

type Step = "consent" | "otp";

type ConsentState = CampConsultationRequestConsent;

const defaultConsent: ConsentState = {
  bio_ai: false,
  blood_report: false,
  questionnaire: false,
};

export function CampConsultationAskRequestModal({
  open,
  onClose,
  engagementId,
  participant,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  engagementId: number;
  participant: CampConsultationParticipantItem | null;
  onSuccess: (updated: CampConsultationParticipantItem) => void;
}) {
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("consent");
      setConsent(defaultConsent);
      setSessionId(null);
      setMaskedPhone(null);
      setOtp("");
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const consentSelected = consent.bio_ai || consent.blood_report || consent.questionnaire;

  const setAllConsent = (value: boolean) => {
    setConsent({
      bio_ai: value,
      blood_report: value,
      questionnaire: value,
    });
  };

  const handleSendOtp = async () => {
    if (!participant || !consentSelected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await expertsPortalApi.sendCampConsultationRequestOtp(engagementId, {
        engagementParticipantId: participant.engagement_participant_id,
        consent,
      });
      setSessionId(res.data.data.session_id);
      setMaskedPhone(res.data.data.masked_phone ?? null);
      setStep("otp");
      setOtp("");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!participant || sessionId === null || !otp.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await expertsPortalApi.verifyCampConsultationRequestOtp(engagementId, {
        engagementParticipantId: participant.engagement_participant_id,
        sessionId,
        otp: otp.trim(),
      });
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const participantName = participant
    ? [participant.first_name, participant.last_name].filter(Boolean).join(" ") || "Participant"
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask consultation request"
      maxWidthClassName="max-w-md"
    >
      {participant ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Request consultation on behalf of <span className="font-medium text-zinc-900">{participantName}</span>.
            The participant must confirm via OTP sent to their phone.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === "consent" ? (
            <>
              <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">Health data consent</p>
                  <button
                    type="button"
                    onClick={() => setAllConsent(true)}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Select all
                  </button>
                </div>
                <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.bio_ai}
                    onChange={(e) => setConsent((c) => ({ ...c, bio_ai: e.target.checked }))}
                    className="mt-0.5"
                  />
                  Bio-AI summary
                </label>
                <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.blood_report}
                    onChange={(e) => setConsent((c) => ({ ...c, blood_report: e.target.checked }))}
                    className="mt-0.5"
                  />
                  Blood test reports
                </label>
                <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.questionnaire}
                    onChange={(e) => setConsent((c) => ({ ...c, questionnaire: e.target.checked }))}
                    className="mt-0.5"
                  />
                  Health assessment / questionnaire
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!consentSelected || loading}
                  onClick={() => void handleSendOtp()}
                  className="px-4 py-2 text-sm rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600">
                Enter the OTP sent to {maskedPhone ?? "the participant's phone"}.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit OTP"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSendOtp()}
                  className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("consent")}
                    className="px-4 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={otp.trim().length < 4 || loading}
                    onClick={() => void handleVerify()}
                    className="px-4 py-2 text-sm rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying…
                      </span>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
