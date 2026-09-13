import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import {
  engagementTypesApi,
  getApiError,
  usersApi,
  type EngagementTypeItem,
  type PublicUserOnboardPayload,
  type PublicUserOnboardResponse,
  type UserDetail,
} from "../../lib/api";

type Step = 1 | 2;
export type OnboardUserMode = "create" | "existing";

const STEP_LABELS = [
  { step: 1 as Step, label: "User", icon: UserRound },
  { step: 2 as Step, label: "Booking", icon: Calendar },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

type CreateForm = {
  first_name: string;
  last_name: string;
  age: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  first_name: "",
  last_name: "",
  age: "",
  phone: "",
  email: "",
  gender: "",
  dob: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  country: "",
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

interface Props {
  open: boolean;
  mode: OnboardUserMode;
  userId: number | null;
  onClose: () => void;
  onSuccess: (result: PublicUserOnboardResponse) => void;
}

export function OnboardUserModal({ open, mode, userId, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>(1);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [step1Error, setStep1Error] = useState<string | null>(null);

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PublicUserOnboardResponse | null>(null);

  const isVifc = engagementType.trim().toLowerCase() === "vifc";
  const isCreate = mode === "create";

  const resetState = useCallback(() => {
    setStep(1);
    setUser(null);
    setUserLoading(false);
    setUserError(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setStep1Error(null);
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
    setSubmitting(false);
    setSubmitError(null);
    setSuccessResult(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      if (mode === "existing") {
        if (userId == null) return;
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
        return;
      }

      // create mode: load engagement types only
      setUserLoading(true);
      setUserError(null);
      try {
        const typesRes = await engagementTypesApi.list({ is_active: true });
        if (cancelled) return;
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
  }, [open, mode, userId]);

  const validateCreateStep = (): boolean => {
    setStep1Error(null);
    if (!createForm.phone.trim()) {
      setStep1Error("Phone is required.");
      return false;
    }
    const ageNum = Number(createForm.age);
    if (!createForm.age.trim() || !Number.isFinite(ageNum)) {
      setStep1Error("Age is required.");
      return false;
    }
    if (ageNum < 1 || ageNum > 120) {
      setStep1Error("Age must be between 1 and 120.");
      return false;
    }
    return true;
  };

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

  const handleSubmit = async () => {
    if (mode === "existing" && userId == null) return;
    if (!validateBookingStep()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking: PublicUserOnboardPayload = {
        engagement_type: engagementType,
        blood_collection_date: isVifc ? null : bloodCollectionDate || null,
        blood_collection_time_slot: isVifc ? null : bloodCollectionTimeSlot.trim() || null,
        participants_employee_id: employeeId.trim() || null,
        participant_department: department.trim() || null,
        participant_blood_group: bloodGroup.trim() || null,
        want_doctor_consultation: wantDoctor,
        want_nutritionist_consultation: wantNutritionist,
        want_doctor_and_nutritionist_consultation: wantBoth,
        questionnaire: null,
      };

      const payload: PublicUserOnboardPayload =
        mode === "existing"
          ? { ...booking, user_id: userId! }
          : {
              ...booking,
              phone: createForm.phone.trim(),
              age: Math.trunc(Number(createForm.age)),
              first_name: createForm.first_name.trim() || null,
              last_name: createForm.last_name.trim() || null,
              email: createForm.email.trim() || null,
              gender: createForm.gender.trim() || null,
              dob: createForm.dob || null,
              address: createForm.address.trim() || null,
              pincode: createForm.pincode.trim() || null,
              city: createForm.city.trim() || null,
              state: createForm.state.trim() || null,
              country: createForm.country.trim() || null,
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

  const field = (label: string, value: string | number | null | undefined) => (
    <div>
      <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{display(value)}</dd>
    </div>
  );

  const inputClass =
    "w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900";

  const modalOpen = open && (isCreate || userId != null);

  return (
    <Modal open={modalOpen} onClose={handleClose} title="Onboard User" maxWidthClassName="max-w-3xl">
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
                <li>User ID: {display(successResult.user_id)}</li>
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
                {isCreate ? (
                  <>
                    {userLoading ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                      </div>
                    ) : userError ? (
                      <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{userError}</div>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-600">
                          Enter user details. Phone and age are required. If the phone already exists,
                          that account will be used.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              First name
                            </label>
                            <input
                              type="text"
                              value={createForm.first_name}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, first_name: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Last name
                            </label>
                            <input
                              type="text"
                              value={createForm.last_name}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, last_name: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Phone *
                            </label>
                            <input
                              type="tel"
                              value={createForm.phone}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, phone: e.target.value })
                              }
                              className={inputClass}
                              placeholder="+91 9999999999"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Age *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={createForm.age}
                              onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
                              className={inputClass}
                              placeholder="18"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={createForm.email}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, email: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Gender
                            </label>
                            <select
                              value={createForm.gender}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, gender: e.target.value })
                              }
                              className={inputClass}
                            >
                              <option value="">—</option>
                              {GENDERS.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Date of birth
                            </label>
                            <input
                              type="date"
                              value={createForm.dob}
                              onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Pincode
                            </label>
                            <input
                              type="text"
                              value={createForm.pincode}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, pincode: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Address
                            </label>
                            <input
                              type="text"
                              value={createForm.address}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, address: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={createForm.city}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, city: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={createForm.state}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, state: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              value={createForm.country}
                              onChange={(e) =>
                                setCreateForm({ ...createForm, country: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {step1Error && (
                      <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{step1Error}</div>
                    )}
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
                        disabled={userLoading || !!userError}
                        onClick={() => {
                          if (!validateCreateStep()) return;
                          setStep(2);
                        }}
                        className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {userLoading ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                      </div>
                    ) : userError ? (
                      <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{userError}</div>
                    ) : user ? (
                      <>
                        <p className="text-sm text-zinc-600">
                          Confirming{" "}
                          <span className="font-medium text-zinc-900">{fullName(user)}</span> (#
                          {user.user_id}). Onboarding uses this existing account; edit profile
                          separately if needed.
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
                  </>
                )}
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
                    onChange={(e) => setEngagementType(e.target.value)}
                    className={inputClass}
                  >
                    {engagementTypes.length === 0 && <option value="bio_ai">bio_ai</option>}
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
                        className={inputClass}
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
                        className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Blood group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className={inputClass}
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
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Onboard
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
