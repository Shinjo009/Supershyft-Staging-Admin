import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { SettingsFormCard, SettingsSectionHeading, inputClass } from "./SettingsFormCard";
import {
  BLOOD_COLLECTION_TYPE_OPTIONS,
  buildDefaultsByType,
  labelAssessment,
  type B2cDefaultsByType,
  emptyTypeDefaults,
} from "./settingsUtils";
import { DiagnosticPackageGroupProviderSelect } from "../diagnostics/DiagnosticPackageGroupProviderSelect";
import { getTypeConfig, getTypeHint } from "../engagements/engagementTypeConfig";
import {
  DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS,
  effectiveLoadPrevCategoryKeys,
} from "../engagements/loadPrevQuestionnaireDefaults";
import { METSIGHTS_PRO_PACKAGE_CODE } from "../engagements/metsightsProGate";
import { useB2cOnboardingProGateStatuses } from "./b2cMetsightsProGate";
import { MetsightsProOnboardingCallout } from "./MetsightsProOnboardingCallout";
import { questionnaireCategoriesApi, type QuestionnaireCategory } from "../../lib/api";
import {
  assessmentPackagesApi,
  diagnosticPackagesApi,
  engagementsApi,
  platformSettingsApi,
  type AssessmentPackage,
  type B2cOnboardingTypeDefaults,
  type DiagnosticPackageBootstrapOption,
  type DiagnosticPackageGroupListItem,
  type EngagementTypeItem,
  type BloodCollectionType,
  getApiError,
} from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionContext";
import { fetchAllPages } from "../../lib/fetchAllPages";

type OnboardingSettingsProps = {
  canEdit: boolean;
};

export function OnboardingSettings({ canEdit }: OnboardingSettingsProps) {
  const { canViewTask } = usePermissions();
  const mayViewAssessments = canViewTask("assessments", "packages");
  const mayViewDiagnostics = canViewTask("diagnostics", "packages");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTypeFromUrl = useRef(searchParams.get("type")?.trim() || null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackSaveOk, setFallbackSaveOk] = useState<string | null>(null);
  const [typeSaveOk, setTypeSaveOk] = useState<string | null>(null);
  const [savingFallback, setSavingFallback] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const [defaultEngagementTypeCode, setDefaultEngagementTypeCode] = useState("bio_ai");
  const [savedDefaultEngagementTypeCode, setSavedDefaultEngagementTypeCode] = useState("bio_ai");
  const [loadPrevCategories, setLoadPrevCategories] = useState<QuestionnaireCategory[]>([]);
  const [assessmentPackages, setAssessmentPackages] = useState<AssessmentPackage[]>([]);
  const [diagnosticPackageGroups, setDiagnosticPackageGroups] = useState<DiagnosticPackageGroupListItem[]>([]);
  const [diagnosticBootstrapOptions, setDiagnosticBootstrapOptions] = useState<
    DiagnosticPackageBootstrapOption[]
  >([]);

  const [b2cEngagementTypes, setB2cEngagementTypes] = useState<EngagementTypeItem[]>([]);
  const [activeEngagementType, setActiveEngagementType] = useState<string>("bio_ai");
  const [defaultsByType, setDefaultsByType] = useState<B2cDefaultsByType>(() =>
    buildDefaultsByType(["bio_ai"], undefined)
  );
  const [savedDefaultsByType, setSavedDefaultsByType] = useState<B2cDefaultsByType>(() =>
    buildDefaultsByType(["bio_ai"], undefined)
  );

  const loadPickers = useCallback(async () => {
    try {
      if (mayViewAssessments) {
        const packages = await fetchAllPages<AssessmentPackage>((page, limit) =>
          assessmentPackagesApi.list({ page, limit, status: "active" })
        );
        setAssessmentPackages(packages);
      }
      if (mayViewDiagnostics) {
        const groupsRes = await diagnosticPackagesApi.listGroups({
          type: "public_package",
          package_for: "public",
        });
        setDiagnosticPackageGroups(groupsRes.data.data ?? []);
        const bootstrap = await engagementsApi.formBootstrap().catch(() => null);
        setDiagnosticBootstrapOptions(bootstrap?.data?.data?.diagnostic_packages ?? []);
      }
    } catch {
      /* optional pickers */
    }
  }, [mayViewAssessments, mayViewDiagnostics]);

  const loadOnboarding = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFallbackSaveOk(null);
    setTypeSaveOk(null);
    try {
      const bootstrapRes = await platformSettingsApi.bootstrap();
      const payload = bootstrapRes.data.data;
      const types = payload.engagement_types ?? [];
      const typeCodes = types.map((t) => t.code);
      setB2cEngagementTypes(types);
      const fromUrl = initialTypeFromUrl.current;
      const initialType =
        fromUrl && typeCodes.includes(fromUrl)
          ? fromUrl
          : typeCodes.includes("bio_ai")
            ? "bio_ai"
            : typeCodes[0] ?? "bio_ai";
      setActiveEngagementType(initialType);
      initialTypeFromUrl.current = null;

      const d = payload.b2c_onboarding;
      const mapped = buildDefaultsByType(typeCodes, d.defaults_by_engagement_type);
      setDefaultsByType(mapped);
      setSavedDefaultsByType(mapped);
      const defaultType = d.default_engagement_type_code ?? "bio_ai";
      setDefaultEngagementTypeCode(defaultType);
      setSavedDefaultEngagementTypeCode(defaultType);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

  useEffect(() => {
    if (loading) return;
    void loadPickers();
    questionnaireCategoriesApi
      .list()
      .then((res) => setLoadPrevCategories(res.data.data ?? []))
      .catch(() => setLoadPrevCategories([]));
  }, [loading, loadPickers]);

  useEffect(() => {
    const code = activeEngagementType;
    if (!code || loading) return;
    const current = searchParams.get("type");
    if (current === code) return;
    const next = new URLSearchParams(searchParams);
    next.set("type", code);
    setSearchParams(next, { replace: true });
  }, [activeEngagementType, loading, searchParams, setSearchParams]);

  function updateActiveDefaults(patch: Partial<B2cOnboardingTypeDefaults>) {
    setDefaultsByType((prev) => ({
      ...prev,
      [activeEngagementType]: { ...(prev[activeEngagementType] ?? emptyTypeDefaults()), ...patch },
    }));
    setTypeSaveOk(null);
  }

  const activeDefaults = defaultsByType[activeEngagementType] ?? emptyTypeDefaults();
  const isTypeDirty = (kind: string) =>
    JSON.stringify(defaultsByType[kind]) !== JSON.stringify(savedDefaultsByType[kind]);
  const fallbackDirty = defaultEngagementTypeCode !== savedDefaultEngagementTypeCode;
  const activeTypeDirty = isTypeDirty(activeEngagementType);

  const activeTypeConfig = getTypeConfig(activeEngagementType);
  const activeTypeHint = getTypeHint(activeEngagementType);
  const diagnosticSplitMode =
    (activeDefaults.diagnostic_package_id_male ?? 0) > 0 ||
    (activeDefaults.diagnostic_package_id_female ?? 0) > 0;

  const applySettingsProGate = activeTypeConfig.needsMetsights && activeTypeConfig.needsDiagnostic;
  const settingsMetsightsProPackageId = useMemo(() => {
    const row = assessmentPackages.find((p) => (p.package_code ?? "").trim() === METSIGHTS_PRO_PACKAGE_CODE);
    return row?.package_id ?? null;
  }, [assessmentPackages]);

  const diagnosticBootstrapById = useMemo(
    () => new Map(diagnosticBootstrapOptions.map((p) => [p.diagnostic_package_id, p])),
    [diagnosticBootstrapOptions]
  );

  const { activeStatus: proGateActiveStatus, keysByPackageId: proGateKeysByPackageId } =
    useB2cOnboardingProGateStatuses({
      engagementTypes: b2cEngagementTypes,
      defaultsByType,
      metsightsProPackageId: settingsMetsightsProPackageId,
      diagnosticBootstrapById,
    });

  const activeProGate = proGateActiveStatus(activeEngagementType);
  const activeProParameterKeys = useMemo(() => {
    const id = activeProGate?.proGatePackageId;
    if (!id) return new Set<string>();
    return proGateKeysByPackageId.get(id) ?? new Set<string>();
  }, [activeProGate?.proGatePackageId, proGateKeysByPackageId]);

  const activeTypeSaveBlocked =
    Boolean(activeProGate?.isProSelected && (activeProGate.loading || activeProGate.blocked));
  const activeTypeSaveDisabledReason = activeProGate?.loading
    ? "Checking diagnostic package for Metsights Pro requirements…"
    : activeProGate?.blocked
      ? "Choose MetSights Essentials or a diagnostic package with LH, FSH, and total testosterone."
      : null;

  const activeFitPrintInvalid =
    activeDefaults.enroll_for_fitprint_full && !activeDefaults.create_profile_on_metsights;

  async function handleSaveFallback(e: React.FormEvent) {
    e.preventDefault();
    setSavingFallback(true);
    setError(null);
    setFallbackSaveOk(null);
    try {
      const res = await platformSettingsApi.patchB2cOnboarding({
        default_engagement_type_code: defaultEngagementTypeCode,
      });
      const savedDefault = res.data.data.default_engagement_type_code ?? defaultEngagementTypeCode;
      setDefaultEngagementTypeCode(savedDefault);
      setSavedDefaultEngagementTypeCode(savedDefault);
      setFallbackSaveOk("Saved fallback journey type.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingFallback(false);
    }
  }

  async function handleSaveActiveType(e: React.FormEvent) {
    e.preventDefault();
    if (activeFitPrintInvalid) {
      setError("FitPrint Full enrollment requires Metsights profile creation for this journey type.");
      return;
    }
    if (activeTypeSaveBlocked) {
      setError(
        "Metsights Pro needs LH, FSH, and total testosterone on the configured diagnostic package for this journey type."
      );
      return;
    }
    setSavingType(true);
    setError(null);
    setTypeSaveOk(null);
    try {
      const entry = defaultsByType[activeEngagementType] ?? emptyTypeDefaults();
      const res = await platformSettingsApi.patchB2cOnboarding({
        defaults_by_engagement_type: { [activeEngagementType]: entry },
      });
      const typeCodes = b2cEngagementTypes.map((t) => t.code);
      const mapped = buildDefaultsByType(typeCodes, res.data.data.defaults_by_engagement_type);
      setDefaultsByType(mapped);
      setSavedDefaultsByType(mapped);
      const displayName =
        b2cEngagementTypes.find((t) => t.code === activeEngagementType)?.display_name ?? activeEngagementType;
      setTypeSaveOk(`Saved defaults for ${displayName}.`);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingType(false);
    }
  }

  const loadPrevCategoriesByGroup = useMemo(() => {
    const metsights: QuestionnaireCategory[] = [];
    const supershyft: QuestionnaireCategory[] = [];
    for (const cat of loadPrevCategories) {
      const key = (cat.category_key ?? "").trim();
      if (!key) continue;
      if ((cat.category_of ?? "").toLowerCase() === "metsights") metsights.push(cat);
      else supershyft.push(cat);
    }
    return { metsights, supershyft };
  }, [loadPrevCategories]);

  const selectedLoadPrevCategoryKeys = effectiveLoadPrevCategoryKeys(
    activeDefaults.load_prev_questionnaire_category_keys
  );

  function toggleLoadPrevCategoryKey(key: string) {
    const current = effectiveLoadPrevCategoryKeys(activeDefaults.load_prev_questionnaire_category_keys);
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    updateActiveDefaults({ load_prev_questionnaire_category_keys: next });
  }

  function discardFallback() {
    setDefaultEngagementTypeCode(savedDefaultEngagementTypeCode);
    setFallbackSaveOk(null);
    setError(null);
  }

  function discardActiveType() {
    setDefaultsByType((prev) => ({
      ...prev,
      [activeEngagementType]: { ...(savedDefaultsByType[activeEngagementType] ?? emptyTypeDefaults()) },
    }));
    setTypeSaveOk(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const activeDisplayName =
    b2cEngagementTypes.find((t) => t.code === activeEngagementType)?.display_name ?? "Journey type";

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-100 bg-red-50 px-4 py-3" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsFormCard
        title="Default journey type"
        description="Used when a new patient onboarding flow does not specify which journey to start."
        success={fallbackSaveOk}
        dirty={fallbackDirty}
        saving={savingFallback}
        readOnly={!canEdit}
        saveLabel="Save"
        onSubmit={handleSaveFallback}
        onDiscard={discardFallback}
      >
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Fallback journey type</label>
          <select
            className={inputClass}
            value={defaultEngagementTypeCode}
            onChange={(ev) => {
              setDefaultEngagementTypeCode(ev.target.value);
              setFallbackSaveOk(null);
            }}
            disabled={!canEdit}
          >
            {b2cEngagementTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.display_name}
              </option>
            ))}
          </select>
        </div>
      </SettingsFormCard>

      <SettingsFormCard
        title="Defaults by journey type"
        description="Each journey type is saved on its own. Changes here apply to new public, family, and admin-onboarded B2C users; existing engagements are unchanged."
        success={typeSaveOk}
        dirty={activeTypeDirty}
        saving={savingType}
        readOnly={!canEdit}
        saveLabel={`Save ${activeDisplayName}`}
        saveDisabled={activeTypeSaveBlocked || activeFitPrintInvalid}
        saveDisabledReason={
          activeFitPrintInvalid
            ? "Turn on Metsights profile creation or turn off FitPrint Full."
            : activeTypeSaveDisabledReason
        }
        onSubmit={handleSaveActiveType}
        onDiscard={discardActiveType}
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <nav
            className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0"
            aria-label="Journey types"
          >
            {b2cEngagementTypes.map((option) => {
              const active = activeEngagementType === option.code;
              const dirty = isTypeDirty(option.code);
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setActiveEngagementType(option.code);
                    setTypeSaveOk(null);
                    setError(null);
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {option.display_name}
                  {dirty ? <span className="ml-1 opacity-80" aria-label="unsaved changes">•</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 space-y-4">
            {activeTypeHint ? <p className="text-xs text-zinc-500">{activeTypeHint}</p> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingsSectionHeading>Packages</SettingsSectionHeading>

              {activeTypeConfig.needsDiagnostic ? (
                <div className="sm:col-span-2 space-y-3">
                  <p className="text-sm font-medium text-zinc-700">Diagnostic packages</p>
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="diag-mode"
                        checked={!diagnosticSplitMode}
                        onChange={() =>
                          updateActiveDefaults({
                            diagnostic_package_id_male: null,
                            diagnostic_package_id_female: null,
                          })
                        }
                        disabled={!canEdit}
                      />
                      One package
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="diag-mode"
                        checked={diagnosticSplitMode}
                        onChange={() =>
                          updateActiveDefaults({
                            diagnostic_package_id: null,
                            diagnostic_package_id_male:
                              activeDefaults.diagnostic_package_id_male ?? activeDefaults.diagnostic_package_id,
                            diagnostic_package_id_female: activeDefaults.diagnostic_package_id_female,
                          })
                        }
                        disabled={!canEdit}
                      />
                      Male and female packages
                    </label>
                  </div>
                  {!diagnosticSplitMode ? (
                    <DiagnosticPackageGroupProviderSelect
                      groups={diagnosticPackageGroups}
                      value={activeDefaults.diagnostic_package_id}
                      onChange={(id) => updateActiveDefaults({ diagnostic_package_id: id })}
                      bootstrapById={diagnosticBootstrapById}
                      disabled={!canEdit}
                      groupLabel="Default diagnostic package"
                      emptyGroupLabel="None"
                      emptyProviderLabel="Select provider"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DiagnosticPackageGroupProviderSelect
                        groups={diagnosticPackageGroups}
                        value={activeDefaults.diagnostic_package_id_male}
                        onChange={(id) =>
                          updateActiveDefaults({ diagnostic_package_id: null, diagnostic_package_id_male: id })
                        }
                        bootstrapById={diagnosticBootstrapById}
                        genderFilter="male"
                        disabled={!canEdit}
                        groupLabel="Male package"
                        emptyGroupLabel="None"
                      />
                      <DiagnosticPackageGroupProviderSelect
                        groups={diagnosticPackageGroups}
                        value={activeDefaults.diagnostic_package_id_female}
                        onChange={(id) =>
                          updateActiveDefaults({ diagnostic_package_id: null, diagnostic_package_id_female: id })
                        }
                        bootstrapById={diagnosticBootstrapById}
                        genderFilter="female"
                        disabled={!canEdit}
                        groupLabel="Female package"
                        emptyGroupLabel="None"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {activeTypeConfig.needsAssessment ? (
                <div className="sm:col-span-2">
                  <label htmlFor="b2c-assessment" className="block text-sm font-medium text-zinc-700 mb-1">
                    Default assessment package
                  </label>
                  <select
                    id="b2c-assessment"
                    className={inputClass}
                    value={activeDefaults.assessment_package_id || 0}
                    onChange={(ev) => updateActiveDefaults({ assessment_package_id: Number(ev.target.value) })}
                    disabled={!canEdit}
                  >
                    <option value={0}>Select package</option>
                    {assessmentPackages.map((pkg) => {
                      const isPro = (pkg.package_code ?? "").trim() === METSIGHTS_PRO_PACKAGE_CODE;
                      const disabled =
                        applySettingsProGate && isPro && activeProGate?.resolved && !activeProGate.allowed;
                      return (
                        <option key={pkg.package_id} value={pkg.package_id} disabled={disabled}>
                          {labelAssessment(pkg)}
                          {disabled ? " (needs LH, FSH, total testosterone on diagnostic package)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <MetsightsProOnboardingCallout
                    activeStatus={activeProGate}
                    parameterKeys={activeProParameterKeys}
                  />
                </div>
              ) : null}

              <SettingsSectionHeading>Collection</SettingsSectionHeading>
              {activeTypeConfig.needsBloodCollection ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Blood collection type</label>
                    <select
                      className={inputClass}
                      value={activeDefaults.blood_collection_type ?? ""}
                      onChange={(ev) =>
                        updateActiveDefaults({
                          blood_collection_type: (ev.target.value || null) as BloodCollectionType | null,
                        })
                      }
                      disabled={!canEdit}
                    >
                      {BLOOD_COLLECTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value || "none"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Slot duration (minutes)</label>
                    <input
                      type="number"
                      min={1}
                      max={480}
                      className={inputClass}
                      value={activeDefaults.slot_duration ?? 20}
                      onChange={(ev) => updateActiveDefaults({ slot_duration: Number(ev.target.value) })}
                      disabled={!canEdit}
                    />
                  </div>
                  {activeDefaults.blood_collection_type === "home_collection" ? (
                    <div className="sm:col-span-2">
                      <span className="block text-sm font-medium text-zinc-700 mb-1">Auto booking</span>
                      <div className="flex gap-5 py-2">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={Boolean(activeDefaults.auto_booking)}
                            onChange={() => updateActiveDefaults({ auto_booking: true })}
                            disabled={!canEdit}
                          />
                          Yes
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={!activeDefaults.auto_booking}
                            onChange={() => updateActiveDefaults({ auto_booking: false })}
                            disabled={!canEdit}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {activeTypeConfig.needsConsultation ? (
                <>
                  <SettingsSectionHeading>Consultation</SettingsSectionHeading>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Consultation mode</label>
                    <select
                      className={inputClass}
                      value={activeDefaults.consultation_mode ?? "online"}
                      onChange={(ev) =>
                        updateActiveDefaults({
                          consultation_mode: (ev.target.value || null) as "online" | "offline" | null,
                        })
                      }
                      disabled={!canEdit}
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </>
              ) : null}

              <SettingsSectionHeading>Payment</SettingsSectionHeading>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Payment type</label>
                <select
                  className={inputClass}
                  value={activeDefaults.payment_type ?? "paid_by_patient"}
                  onChange={(ev) =>
                    updateActiveDefaults({
                      payment_type: ev.target.value as "paid_by_patient" | "paid_by_group",
                    })
                  }
                  disabled={!canEdit}
                >
                  <option value="paid_by_patient">Paid by patient</option>
                  <option value="paid_by_group">Paid by group</option>
                </select>
                {activeDefaults.payment_type === "paid_by_group" ? (
                  <p className="text-xs text-amber-700 mt-1">Patients will not be prompted for payment on onboard.</p>
                ) : null}
              </div>

              <SettingsSectionHeading>Profiles</SettingsSectionHeading>
              {activeTypeConfig.needsMetsights || activeTypeConfig.needsFitPrint ? (
                <>
                  {activeTypeConfig.needsMetsights ? (
                    <div>
                      <span className="block text-sm font-medium text-zinc-700 mb-1">Create profile on Metsights</span>
                      <div className="flex gap-5 py-2">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={activeDefaults.create_profile_on_metsights}
                            onChange={() => updateActiveDefaults({ create_profile_on_metsights: true })}
                            disabled={!canEdit}
                          />
                          Yes
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={!activeDefaults.create_profile_on_metsights}
                            onChange={() => updateActiveDefaults({ create_profile_on_metsights: false })}
                            disabled={!canEdit}
                          />
                          No
                        </label>
                      </div>
                    </div>
                  ) : null}
                  {activeTypeConfig.needsFitPrint ? (
                    <div>
                      <span className="block text-sm font-medium text-zinc-700 mb-1">Enroll for FitPrint Full</span>
                      <div className="flex gap-5 py-2">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={activeDefaults.enroll_for_fitprint_full}
                            onChange={() => updateActiveDefaults({ enroll_for_fitprint_full: true })}
                            disabled={!canEdit}
                          />
                          Yes
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="radio"
                            checked={!activeDefaults.enroll_for_fitprint_full}
                            onChange={() => updateActiveDefaults({ enroll_for_fitprint_full: false })}
                            disabled={!canEdit}
                          />
                          No
                        </label>
                      </div>
                      {activeFitPrintInvalid ? (
                        <p className="text-xs text-red-600">FitPrint Full requires Metsights profile creation.</p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}

              {activeTypeConfig.needsAssessment ? (
                <>
                  <SettingsSectionHeading>Questionnaires</SettingsSectionHeading>
                  <div className="sm:col-span-2">
                    <span className="block text-sm font-medium text-zinc-700 mb-1">
                      Load previous assessment questionnaires
                    </span>
                    <div className="flex gap-5 py-2">
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="radio"
                          checked={Boolean(activeDefaults.load_prev_assessment_questionnaires)}
                          onChange={() =>
                            updateActiveDefaults({
                              load_prev_assessment_questionnaires: true,
                              load_prev_questionnaire_category_keys:
                                activeDefaults.load_prev_questionnaire_category_keys?.length
                                  ? activeDefaults.load_prev_questionnaire_category_keys
                                  : [...DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS],
                            })
                          }
                          disabled={!canEdit}
                        />
                        Yes
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="radio"
                          checked={!activeDefaults.load_prev_assessment_questionnaires}
                          onChange={() => updateActiveDefaults({ load_prev_assessment_questionnaires: false })}
                          disabled={!canEdit}
                        />
                        No
                      </label>
                    </div>
                    {activeDefaults.load_prev_assessment_questionnaires ? (
                      <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 p-3">
                        {(["metsights", "supershyft"] as const).map((group) => {
                          const rows =
                            group === "metsights"
                              ? loadPrevCategoriesByGroup.metsights
                              : loadPrevCategoriesByGroup.supershyft;
                          if (rows.length === 0) return null;
                          return (
                            <div key={group}>
                              <p className="text-xs text-zinc-500 mb-1 capitalize">{group}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {rows.map((cat) => (
                                  <label
                                    key={cat.category_id}
                                    className="inline-flex items-center gap-2 text-sm text-zinc-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedLoadPrevCategoryKeys.includes(cat.category_key)}
                                      onChange={() => toggleLoadPrevCategoryKey(cat.category_key)}
                                      disabled={!canEdit}
                                    />
                                    {cat.display_name || cat.category_key}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </SettingsFormCard>
    </div>
  );
}