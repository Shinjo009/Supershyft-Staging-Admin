import { useCallback, useEffect, useState } from "react";
import {
  Apple,
  Calendar,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Loader2,
  Ruler,
  UserRound,
} from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import {
  assessmentPackagesApi,
  engagementTypesApi,
  getApiError,
  platformSettingsApi,
  questionnaireCategoriesApi,
  usersApi,
  type ConsoleQuestionnaireQuestion,
  type EngagementTypeItem,
  type PublicUserOnboardResponse,
  type QuestionnaireQuestion,
  type UserDetail,
} from "../../lib/api";
import { QuestionInput } from "../console/QuestionInput";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const ONBOARD_QUESTIONNAIRE_CATEGORY_KEYS = [
  "anthropometry",
  "diet-lifestyle-parameters",
  "vitals",
  "fitness-parameters",
] as const;

type OnboardCategoryCanonical = (typeof ONBOARD_QUESTIONNAIRE_CATEGORY_KEYS)[number];

const CANONICAL_BY_STEP: Partial<Record<Step, OnboardCategoryCanonical>> = {
  3: "anthropometry",
  4: "diet-lifestyle-parameters",
  5: "vitals",
  6: "fitness-parameters",
};

const STEP_LABELS = [
  { step: 1 as Step, label: "User", icon: UserRound },
  { step: 2 as Step, label: "Booking", icon: Calendar },
  { step: 3 as Step, label: "Anthropometry", icon: Ruler },
  { step: 4 as Step, label: "Diet & Lifestyle", icon: Apple },
  { step: 5 as Step, label: "Vitals", icon: HeartPulse },
  { step: 6 as Step, label: "Fitness Params", icon: Dumbbell },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ONBOARD_CATEGORY_KEY_ALIASES: Record<string, string> = {
  health_vitals: "vitals",
};

const ONBOARD_CATEGORY_DISPLAY_NAMES: Record<OnboardCategoryCanonical, string> = {
  anthropometry: "Anthropometry",
  "diet-lifestyle-parameters": "Diet & Lifestyle",
  vitals: "Vitals",
  "fitness-parameters": "Fitness Params",
};

function normalizeOnboardCategoryKey(raw: string): OnboardCategoryCanonical | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const canonical = ONBOARD_CATEGORY_KEY_ALIASES[key] ?? key;
  return (ONBOARD_QUESTIONNAIRE_CATEGORY_KEYS as readonly string[]).includes(canonical)
    ? (canonical as OnboardCategoryCanonical)
    : null;
}

type PackageCategoryBlock = {
  canonical: OnboardCategoryCanonical;
  category_id: number;
  category_key: string;
  display_name: string;
  questions: QuestionnaireQuestion[];
};

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function fullName(u: UserDetail | null): string {
  if (!u) return "—";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.email || u.phone || `User #${u.user_id}`;
}

function toConsoleQuestion(q: QuestionnaireQuestion): ConsoleQuestionnaireQuestion {
  return {
    question_id: q.question_id,
    question_text: q.question_text,
    question_type: q.question_type,
    question_key: q.question_key,
    category_id: q.category_id,
    is_required: q.is_required,
    is_read_only: q.is_read_only,
    help_text: q.help_text,
    options: q.options ?? null,
  };
}

function isAnswered(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => isAnswered(v));
  }
  return true;
}

interface Props {
  open: boolean;
  userId: number | null;
  onClose: () => void;
  onSuccess: (result: PublicUserOnboardResponse) => void;
}

export function OnboardUserModal({ open, userId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>(1);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const [engagementTypes, setEngagementTypes] = useState<EngagementTypeItem[]>([]);
  const [engagementType, setEngagementType] = useState("bio_ai");
  const [bloodCollectionDate, setBloodCollectionDate] = useState("");
  const [bloodCollectionTimeSlot, setBloodCollectionTimeSlot] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [wantDoctor, setWantDoctor] = useState(false);
  const [wantNutritionist, setWantNutritionist] = useState(false);
  const [wantBoth, setWantBoth] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const [categories, setCategories] = useState<PackageCategoryBlock[]>([]);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionsLoadedForType, setQuestionsLoadedForType] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PublicUserOnboardResponse | null>(null);

  const isVifc = engagementType.trim().toLowerCase() === "vifc";
  const isCategoryStep = step >= 3;

  const resetState = useCallback(() => {
    setStep(1);
    setUser(null);
    setUserLoading(false);
    setUserError(null);
    setEngagementType("bio_ai");
    setBloodCollectionDate("");
    setBloodCollectionTimeSlot("");
    setEmployeeId("");
    setDepartment("");
    setBloodGroup("");
    setWantDoctor(false);
    setWantNutritionist(false);
    setWantBoth(false);
    setStep2Error(null);
    setCategories([]);
    setAnswers({});
    setQuestionsLoading(false);
    setQuestionsError(null);
    setQuestionsLoadedForType(null);
    setSubmitting(false);
    setSubmitError(null);
    setSuccessResult(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    if (!open || userId == null) return;

    let cancelled = false;
    (async () => {
      setUserLoading(true);
      setUserError(null);
      setUser(null);
      try {
        const [userRes, typesRes] = await Promise.all([
          usersApi.get(userId),
          engagementTypesApi.list({ is_active: true }),
        ]);
        if (cancelled) return;
        setUser(userRes.data.data);
        const types = typesRes.data.data ?? [];
        setEngagementTypes(types);
        const hasBioAi = types.some((t) => t.code === "bio_ai");
        if (!hasBioAi && types[0]?.code) {
          setEngagementType(types[0].code);
        } else {
          setEngagementType("bio_ai");
        }
      } catch (err) {
        if (!cancelled) setUserError(getApiError(err));
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const loadQuestionnaire = useCallback(async (typeCode: string) => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setCategories([]);
    setAnswers({});
    try {
      const settingsRes = await platformSettingsApi.getB2cOnboarding();
      const defaults = settingsRes.data.data.defaults_by_engagement_type ?? {};
      const typeDefaults = defaults[typeCode] ?? defaults.bio_ai;
      const packageId = typeDefaults?.assessment_package_id;
      if (packageId == null) {
        setQuestionsError(
          `No B2C assessment package configured for engagement type "${typeCode}". Configure it in Settings.`
        );
        setQuestionsLoadedForType(typeCode);
        return;
      }

      const catsRes = await assessmentPackagesApi.listCategories(packageId);
      const packageCats = (catsRes.data.data ?? []).filter(
        (c) => (c.status ?? "active").toLowerCase() === "active"
      );

      const byCanonical = new Map<
        OnboardCategoryCanonical,
        { category_id: number; category_key: string; display_name: string }
      >();
      for (const cat of packageCats) {
        const rawKey = (cat.category_key ?? "").trim();
        const canonical = normalizeOnboardCategoryKey(rawKey);
        if (!canonical) continue;
        if (byCanonical.has(canonical)) continue;
        byCanonical.set(canonical, {
          category_id: cat.category_id,
          category_key: rawKey || canonical,
          display_name:
            ONBOARD_CATEGORY_DISPLAY_NAMES[canonical] ||
            cat.display_name ||
            rawKey ||
            canonical,
        });
      }

      const blocks: PackageCategoryBlock[] = [];
      for (const canonical of ONBOARD_QUESTIONNAIRE_CATEGORY_KEYS) {
        const cat = byCanonical.get(canonical);
        if (!cat) continue;
        const qRes = await questionnaireCategoriesApi.listQuestions(cat.category_id);
        const questions = (qRes.data.data ?? []).filter(
          (q) => (q.status ?? "active").toLowerCase() === "active"
        );
        blocks.push({
          canonical,
          category_id: cat.category_id,
          category_key: cat.category_key,
          display_name: cat.display_name,
          questions,
        });
      }

      setCategories(blocks);
      setQuestionsLoadedForType(typeCode);
    } catch (err) {
      setQuestionsError(getApiError(err));
      setQuestionsLoadedForType(typeCode);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const validateBookingStep = (): boolean => {
    setStep2Error(null);
    setSubmitError(null);
    if (!engagementType.trim()) {
      setStep2Error("Engagement type is required.");
      return false;
    }
    if (!isVifc) {
      if (!bloodCollectionDate) {
        setStep2Error("Blood collection date is required.");
        return false;
      }
      if (!bloodCollectionTimeSlot.trim()) {
        setStep2Error("Blood collection time slot is required.");
        return false;
      }
    }
    return true;
  };

  const goToQuestionnaire = async () => {
    if (!validateBookingStep()) return;
    setStep(3);
    if (questionsLoadedForType !== engagementType) {
      await loadQuestionnaire(engagementType);
    }
  };

  const buildQuestionnairePayload = () => {
    const questionnaire: Record<string, { responses: { question_id: number; answer: unknown }[] }> =
      {};
    for (const cat of categories) {
      const responses = cat.questions
        .map((q) => {
          const answer = answers[q.question_id];
          if (!isAnswered(answer)) return null;
          return { question_id: q.question_id, answer };
        })
        .filter((r): r is { question_id: number; answer: unknown } => r != null);
      if (responses.length > 0) {
        questionnaire[cat.category_key] = { responses };
      }
    }
    return Object.keys(questionnaire).length > 0 ? questionnaire : undefined;
  };

  const handleSubmit = async (opts?: { skipQuestionnaire?: boolean }) => {
    if (userId == null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        user_id: userId,
        engagement_type: engagementType,
        blood_collection_date: isVifc ? null : bloodCollectionDate || null,
        blood_collection_time_slot: isVifc ? null : bloodCollectionTimeSlot.trim() || null,
        participants_employee_id: employeeId.trim() || null,
        participant_department: department.trim() || null,
        participant_blood_group: bloodGroup.trim() || null,
        want_doctor_consultation: wantDoctor,
        want_nutritionist_consultation: wantNutritionist,
        want_doctor_and_nutritionist_consultation: wantBoth,
        questionnaire: opts?.skipQuestionnaire ? null : buildQuestionnairePayload() ?? null,
      };
      const res = await usersApi.publicOnboard(payload);
      const result = res.data.data;
      setSuccessResult(result);
      onSuccess(result);
    } catch (err) {
      setSubmitError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onboardFromBooking = async () => {
    if (!validateBookingStep()) return;
    await handleSubmit({ skipQuestionnaire: true });
  };

  const field = (label: string, value: string | number | null | undefined) => (
    <div>
      <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{display(value)}</dd>
    </div>
  );

  const renderCategoryStep = (categoryStep: Step) => {
    const canonical = CANONICAL_BY_STEP[categoryStep];
    if (!canonical) return null;
    const title = ONBOARD_CATEGORY_DISPLAY_NAMES[canonical];
    const cat = categories.find((c) => c.canonical === canonical) ?? null;
    const isLast = categoryStep === 6;
    const prevStep = (categoryStep - 1) as Step;
    const nextStep = !isLast ? ((categoryStep + 1) as Step) : null;

    return (
      <div className="space-y-4">
        {questionsLoading ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Loading {title}…</p>
          </div>
        ) : questionsError && categories.length === 0 ? (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
            {questionsError}
            <p className="mt-1 text-amber-700">
              You can skip ahead or submit without questionnaire answers.
            </p>
          </div>
        ) : !cat ? (
          <p className="text-sm text-zinc-500">
            {title} is not on the B2C package for this engagement type. You can continue.
          </p>
        ) : cat.questions.length === 0 ? (
          <p className="text-sm text-zinc-500">No active questions in {title}.</p>
        ) : (
          <div className="space-y-4 max-h-[min(28rem,55vh)] overflow-y-auto pr-1">
            <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-200 pb-1">
              {cat.display_name}
            </h3>
            {cat.questions.map((q) => (
              <div key={q.question_id} className="space-y-2">
                <p className="text-sm font-medium text-zinc-800">
                  {q.question_text || q.question_key || `Question #${q.question_id}`}
                  {q.is_required ? <span className="text-red-500 ml-0.5">*</span> : null}
                </p>
                {q.help_text ? <p className="text-xs text-zinc-500">{q.help_text}</p> : null}
                <QuestionInput
                  question={toConsoleQuestion(q)}
                  value={answers[q.question_id]}
                  onChange={(value) =>
                    setAnswers((prev) => ({ ...prev, [q.question_id]: value }))
                  }
                  disabled={submitting}
                />
              </div>
            ))}
          </div>
        )}

        {isLast && submitError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{submitError}</div>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep(prevStep)}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Back
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            {isLast ? (
              <>
                <button
                  type="button"
                  disabled={submitting || questionsLoading}
                  onClick={() => void handleSubmit({ skipQuestionnaire: true })}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Skip & submit
                </button>
                <button
                  type="button"
                  disabled={submitting || questionsLoading}
                  onClick={() => void handleSubmit()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit onboard
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting || questionsLoading}
                  onClick={() => nextStep && setStep(nextStep)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={submitting || questionsLoading}
                  onClick={() => nextStep && setStep(nextStep)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  Next
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open && userId != null}
      onClose={handleClose}
      title="Onboard User"
      maxWidthClassName={isCategoryStep ? "max-w-5xl" : "max-w-3xl"}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {STEP_LABELS.map(({ step: s, label, icon: Icon }, idx) => {
            const isComplete = step > s || successResult != null;
            const isCurrent = step === s && successResult == null;
            return (
              <div key={s} className="flex items-center flex-1 min-w-[4.5rem]">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      isComplete
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`mt-1 text-[10px] sm:text-xs text-center leading-tight ${
                      isCurrent ? "font-medium text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-4 min-w-[0.5rem] ${
                      step > s || successResult ? "bg-emerald-600" : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {successResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">User onboarded successfully.</p>
              <ul className="mt-2 space-y-1 text-emerald-800">
                <li>Engagement ID: {display(successResult.engagement_id)}</li>
                <li>Engagement code: {display(successResult.engagement_code)}</li>
                <li>Participant ID: {display(successResult.engagement_participant_id)}</li>
                {successResult.assessment_instance_id != null && (
                  <li>Assessment instance: {successResult.assessment_instance_id}</li>
                )}
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                {userLoading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                  </div>
                ) : userError ? (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{userError}</div>
                ) : user ? (
                  <>
                    <p className="text-sm text-zinc-600">
                      Confirming <span className="font-medium text-zinc-900">{fullName(user)}</span>
                      {" "}(#{user.user_id}). Onboarding uses this existing account; edit profile separately if needed.
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-zinc-200 p-4 bg-zinc-50/50">
                      {field("First name", user.first_name)}
                      {field("Last name", user.last_name)}
                      {field("Age", user.age)}
                      {field("Phone", user.phone)}
                      {field("Email", user.email)}
                      {field("Gender", user.gender)}
                      {field("Date of birth", user.date_of_birth)}
                      {field("Address", user.address)}
                      {field("Pincode", user.pin_code)}
                      {field("City", user.city)}
                      {field("State", user.state)}
                      {field("Country", user.country)}
                    </dl>
                  </>
                ) : null}
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={userLoading || !!userError || !user}
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Engagement type
                  </label>
                  <select
                    value={engagementType}
                    onChange={(e) => {
                      setEngagementType(e.target.value);
                      setQuestionsLoadedForType(null);
                    }}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {engagementTypes.length === 0 && (
                      <option value="bio_ai">bio_ai</option>
                    )}
                    {engagementTypes.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.display_name || t.code}
                      </option>
                    ))}
                  </select>
                </div>

                {!isVifc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Blood collection date
                      </label>
                      <input
                        type="date"
                        value={bloodCollectionDate}
                        onChange={(e) => setBloodCollectionDate(e.target.value)}
                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Blood collection time slot
                      </label>
                      <input
                        type="text"
                        value={bloodCollectionTimeSlot}
                        onChange={(e) => setBloodCollectionTimeSlot(e.target.value)}
                        placeholder="e.g. 09:00"
                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Blood group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">—</option>
                      {BLOOD_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-700">Consultations</p>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={wantDoctor}
                      onChange={(e) => setWantDoctor(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Want doctor consultation
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={wantNutritionist}
                      onChange={(e) => setWantNutritionist(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Want nutritionist consultation
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={wantBoth}
                      onChange={(e) => setWantBoth(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Want doctor and nutritionist consultation
                  </label>
                </div>

                {step2Error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{step2Error}</div>
                )}
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{submitError}</div>
                )}

                <div className="flex justify-between gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void goToQuestionnaire()}
                      className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void onboardFromBooking()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Onboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && renderCategoryStep(3)}
            {step === 4 && renderCategoryStep(4)}
            {step === 5 && renderCategoryStep(5)}
            {step === 6 && renderCategoryStep(6)}
          </>
        )}
      </div>
    </Modal>
  );
}
