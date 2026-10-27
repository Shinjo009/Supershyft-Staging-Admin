import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { CampConsultationAskRequestModal } from "./CampConsultationAskRequestModal";
import {
  manageDetailToConsentParticipantItem,
  needsAskConsentFromManageDetail,
} from "./campConsultationConsent";
import {
  categoryCompletionLabel,
  formatQuestionnaireAnswer,
  prepareExpertQuestionnaireCategories,
  shouldHideQuestionInExpertView,
} from "./questionnaireAnswerDisplay";
import { ExpertPortalLayout } from "../../layouts/ExpertPortalLayout";
import {
  expertsPortalApi,
  getApiError,
  uploadsApi,
  type CampConsultationParticipantItem,
  type ConsultationManageDetail,
  type ConsultationQuestionnaireCategory,
  type ConsultationQuestionnairePayload,
  type ConsultationQuestionnaireQuestion,
} from "../../lib/api";

type PdfKind = "bio_ai" | "blood_report";
type SharedRecordsView = PdfKind | "questionnaire" | null;

type CampNavState = {
  fromCamp?: boolean;
  engagementId?: number;
  engagementName?: string;
};

function formatName(detail: ConsultationManageDetail): string {
  const name = [detail.first_name, detail.last_name].filter(Boolean).join(" ").trim();
  return name || `User #${detail.user_id}`;
}

function formatType(typeKey: string): string {
  if (!typeKey) return "—";
  return typeKey.charAt(0).toUpperCase() + typeKey.slice(1).replace(/_/g, " ");
}

function attachmentLabel(url: string): string {
  try {
    const path = url.split("?")[0];
    const parts = path.split("/");
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

function QuestionAnswerRow({ question }: { question: ConsultationQuestionnaireQuestion }) {
  const formatted = formatQuestionnaireAnswer(question);
  const label =
    String(question.question_text || question.question_key || `Question #${question.question_id}`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 py-2.5 border-b border-zinc-100 last:border-0">
      <div className="text-sm text-zinc-700">{label}</div>
      <div className="text-sm text-zinc-900 font-medium">
        {formatted.kind === "empty" ? (
          <span className="text-zinc-400 font-normal">Not answered</span>
        ) : formatted.kind === "chips" ? (
          <div className="flex flex-wrap gap-1.5">
            {formatted.labels.map((chip) => (
              <span
                key={chip}
                className="inline-flex px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-xs font-medium"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : (
          formatted.text
        )}
      </div>
    </div>
  );
}

function QuestionnairePane({
  categories,
  expandedKeys,
  onToggle,
}: {
  categories: ConsultationQuestionnaireCategory[];
  expandedKeys: Set<string>;
  onToggle: (categoryKey: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-zinc-500">
        No questionnaire data available
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-3 sm:p-4">
      <div className="space-y-2">
        {categories.map((cat) => {
          const key = String(cat.category_key ?? cat.category_id);
          const open = expandedKeys.has(key);
          const { answered, total, complete } = categoryCompletionLabel(cat);
          const visibleQuestions = cat.questions.filter((q) => !shouldHideQuestionInExpertView(q));

          return (
            <div key={key} className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => onToggle(key)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 truncate">
                    {cat.display_name || cat.category_key || `Category #${cat.category_id}`}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {answered}/{total} answered
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {complete ? "Complete" : "Incomplete"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {open ? (
                <div className="px-3 pb-3 border-t border-zinc-100">
                  {visibleQuestions.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-3">No questions in this category</p>
                  ) : (
                    visibleQuestions.map((q) => <QuestionAnswerRow key={q.question_id} question={q} />)
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExpertConsultationManagePage() {
  const { consultationId: consultationIdParam } = useParams<{ consultationId: string }>();
  const consultationId = Number(consultationIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const campState = (location.state as CampNavState | null) ?? null;
  const fromCamp = Boolean(campState?.fromCamp && campState?.engagementId);
  const backPath = fromCamp
    ? `/experts/portal/camp-consultations/${campState?.engagementId}`
    : "/experts/upcoming";
  const backLabel = fromCamp ? "Participants" : "Upcoming";

  const [detail, setDetail] = useState<ConsultationManageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [meetLink, setMeetLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [doing, setDoing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [sharedView, setSharedView] = useState<SharedRecordsView>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<ConsultationQuestionnairePayload | null>(null);
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<Set<string>>(new Set());

  const [askConsentOpen, setAskConsentOpen] = useState(false);
  const [askConsentParticipant, setAskConsentParticipant] =
    useState<CampConsultationParticipantItem | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(consultationId) || consultationId <= 0) {
      setError("Invalid consultation id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await expertsPortalApi.getConsultation(consultationId);
      const data = res.data.data;
      setDetail(data);
      setSummary(data.consultation_summary ?? "");
      setAttachments(data.attachments ?? []);
      setMeetLink(data.meet_link ?? "");
    } catch (err) {
      setError(getApiError(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setQuestionnaire(null);
    setQuestionnaireError(null);
    setExpandedCategoryKeys(new Set());
    setSharedView(null);
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [consultationId]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const canMarkDone = Boolean(detail && !detail.done && detail.within_engagement_window);

  const shared = detail?.shared_resources;

  const categories = useMemo(() => {
    if (!questionnaire) return [];
    const flat: ConsultationQuestionnaireCategory[] = [];
    for (const assessment of questionnaire.assessments) {
      flat.push(...assessment.categories);
    }
    return prepareExpertQuestionnaireCategories(flat);
  }, [questionnaire]);

  const loadPdf = async (kind: PdfKind) => {
    if (!detail) return;
    const state = shared?.[kind];
    if (!state?.consent) {
      setPdfError("Patient has not shared this report");
      setSharedView(kind);
      return;
    }
    if (!state.available) {
      setPdfError("Report is not available yet");
      setSharedView(kind);
      return;
    }

    setSharedView(kind);
    setPdfLoading(true);
    setPdfError(null);
    try {
      const blob = await expertsPortalApi.fetchConsultationPdfBlob(consultationId, kind);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      setPdfError(getApiError(err));
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const openQuestionnaire = async () => {
    if (!detail || !shared?.questionnaire.consent) return;
    if (sharedView === "questionnaire") {
      setSharedView(null);
      return;
    }

    setSharedView("questionnaire");
    setPdfError(null);
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (questionnaire) return;

    setQuestionnaireError(null);
    setQuestionnaireLoading(true);
    try {
      const res = await expertsPortalApi.getConsultationQuestionnaire(consultationId);
      setQuestionnaire(res.data.data);
    } catch (err) {
      setQuestionnaireError(getApiError(err));
      setQuestionnaire(null);
    } finally {
      setQuestionnaireLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length === 0) return;
    setExpandedCategoryKeys((prev) => {
      if (prev.size > 0) return prev;
      const firstWithAnswers = categories.find((cat) => categoryCompletionLabel(cat).answered > 0);
      const target = firstWithAnswers ?? categories[0];
      const key = String(target.category_key ?? target.category_id);
      return new Set([key]);
    });
  }, [categories]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) next.delete(categoryKey);
      else next.add(categoryKey);
      return next;
    });
  };

  const saveConsultationNotes = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const res = await expertsPortalApi.updateConsultation(consultationId, {
        consultation_summary: summary,
        attachments,
        meet_link: meetLink.trim() || null,
      });
      const data = res.data.data;
      setDetail(data);
      setSummary(data.consultation_summary ?? "");
      setAttachments(data.attachments ?? []);
      setMeetLink(data.meet_link ?? "");
      return true;
    } catch (err) {
      setError(getApiError(err));
      return false;
    }
  }, [attachments, consultationId, meetLink, summary]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConsultationNotes();
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadsApi.uploadConsultationAttachments(Array.from(files));
      const urls = res.data.data.urls ?? [];
      setAttachments((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDone = async () => {
    if (!canMarkDone) return;
    if (!window.confirm("Mark this consultation as done?")) return;
    setDoing(true);
    try {
      const saved = await saveConsultationNotes();
      if (!saved) return;
      await expertsPortalApi.markConsultationDoneById(consultationId);
      navigate(backPath);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDoing(false);
    }
  };

  const showQuestionnairePane = sharedView === "questionnaire";
  const showPdfPane = sharedView === "bio_ai" || sharedView === "blood_report";

  return (
    <ExpertPortalLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <Link
              to={backPath}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
            {detail ? (
              <>
                <h1 className="text-xl font-semibold text-zinc-900 truncate">{formatName(detail)}</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {formatType(detail.expert_type)}
                  {detail.date ? ` · ${detail.date}` : ""}
                  {detail.slot ? ` · ${detail.slot}` : ""}
                  {detail.cabin ? ` · ${detail.cabin}` : ""}
                  {detail.engagement_code ? ` · ${detail.engagement_code}` : ""}
                </p>
              </>
            ) : (
              <h1 className="text-xl font-semibold text-zinc-900">Consultation</h1>
            )}
          </div>
          <button
            type="button"
            disabled={!canMarkDone || doing || saving || loading}
            onClick={() => void handleDone()}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 shrink-0"
            title={
              detail && !detail.within_engagement_window
                ? "Available during the engagement period"
                : detail?.done
                  ? "Already marked done"
                  : undefined
            }
          >
            {doing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Done"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : !detail ? (
          <div className="text-sm text-zinc-500 py-12 text-center">Consultation not found</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col min-h-[28rem]">
              <div className="px-4 py-3 border-b border-zinc-100 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Shared records</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Visible only when the patient has given consent.
                  </p>
                </div>
                {needsAskConsentFromManageDetail(detail) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAskConsentParticipant(manageDetailToConsentParticipantItem(detail));
                      setAskConsentOpen(true);
                    }}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
                  >
                    Ask consent
                  </button>
                ) : null}
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-zinc-100">
                <SharedButton
                  label="BioAI"
                  state={shared?.bio_ai}
                  active={sharedView === "bio_ai"}
                  onClick={() => void loadPdf("bio_ai")}
                />
                <SharedButton
                  label="Blood report"
                  state={shared?.blood_report}
                  active={sharedView === "blood_report"}
                  onClick={() => void loadPdf("blood_report")}
                />
                <SharedButton
                  label="Questionnaire"
                  state={shared?.questionnaire}
                  active={sharedView === "questionnaire"}
                  onClick={() => void openQuestionnaire()}
                />
              </div>
              <div className="flex-1 bg-zinc-50 relative min-h-[20rem]">
                {showQuestionnairePane ? (
                  questionnaireLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                    </div>
                  ) : questionnaireError ? (
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-600">
                      {questionnaireError}
                    </div>
                  ) : (
                    <QuestionnairePane
                      categories={categories}
                      expandedKeys={expandedCategoryKeys}
                      onToggle={toggleCategory}
                    />
                  )
                ) : showPdfPane && pdfLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                  </div>
                ) : showPdfPane && pdfError ? (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-zinc-500">
                    {pdfError}
                  </div>
                ) : showPdfPane && pdfBlobUrl ? (
                  <iframe
                    title={sharedView === "bio_ai" ? "BioAI report" : "Blood report"}
                    src={pdfBlobUrl}
                    className="absolute inset-0 w-full h-full border-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2 px-6 text-center">
                    <FileText className="w-10 h-10" />
                    <p className="text-sm">
                      Select BioAI, Blood report, or Questionnaire to view here
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Consultation notes</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Save a summary and attachments for this session.
                </p>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Summary</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                  placeholder="Add consultation summary..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-y min-h-[10rem]"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Attachments</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((url) => (
                    <span
                      key={url}
                      className="inline-flex items-center gap-1.5 max-w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700"
                    >
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="truncate">{attachmentLabel(url)}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((u) => u !== url))}
                        className="text-zinc-400 hover:text-zinc-700"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5" />
                  )}
                  Add files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      void handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Google Meet link (optional)</label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={saving || doing}
                  onClick={() => void handleSave()}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {detail ? (
        <CampConsultationAskRequestModal
          open={askConsentOpen}
          onClose={() => {
            setAskConsentOpen(false);
            setAskConsentParticipant(null);
          }}
          engagementId={detail.engagement_id}
          participant={askConsentParticipant}
          mode="consent"
          onSuccess={() => {
            setAskConsentOpen(false);
            setAskConsentParticipant(null);
            void load();
          }}
        />
      ) : null}
    </ExpertPortalLayout>
  );
}

function SharedButton({
  label,
  state,
  active,
  onClick,
}: {
  label: string;
  state?: { consent: boolean; available: boolean };
  active?: boolean;
  onClick: () => void;
}) {
  const consented = Boolean(state?.consent);
  const available = Boolean(state?.available);
  const disabled = !consented;
  let title = "";
  if (!consented) title = "Patient has not shared this";
  else if (!available) title = "Not available yet";

  return (
    <button
      type="button"
      disabled={disabled}
      title={title || undefined}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        active
          ? "bg-zinc-900 text-white border-zinc-900"
          : disabled
            ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
            : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
      {consented && !available ? " · N/A" : ""}
    </button>
  );
}
