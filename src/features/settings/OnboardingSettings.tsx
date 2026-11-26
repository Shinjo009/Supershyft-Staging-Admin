import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  SettingsSegmentedControl,
  YES_NO_OPTIONS,
  boolToYesNo,
  yesNoToBool,
} from "./SettingsSegmentedControl";
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

const DIAGNOSTIC_PACKAGE_MODE_OPTIONS = [
  { value: "one", label: "One package" },
  { value: "split", label: "Male and female packages" },
] as const;

function sectionTestId(title: string) {
  return `onboarding-section-${title.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

function CategoryHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        <SettingsSectionHeading>{children}</SettingsSectionHeading>
      </div>
      <div className="h-px flex-1 bg-zinc-200" aria-hidden />
    </div>
  );
}

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={sectionTestId(title)} className="mt-6 space-y-3">
      <CategoryHeading>{title}</CategoryHeading>
      {children}
    </section>
  );
}

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

  async function saveFallback(nextCode: string) {
    if (!canEdit || savingFallback || nextCode === savedDefaultEngagementTypeCode) return;
    const previous = savedDefaultEngagementTypeCode;
    setDefaultEngagementTypeCode(nextCode);
    setSavingFallback(true);
    setError(null);
    setFallbackSaveOk(null);
    try {
      const res = await platformSettingsApi.patchB2cOnboarding({
        default_engagement_type_code: nextCode,
      });
      const savedDefault = res.data.data.default_engagement_type_code ?? nextCode;
      setDefaultEngagementTypeCode(savedDefault);
      setSavedDefaultEngagementTypeCode(savedDefault);
      setFallbackSaveOk("Saved fallback journey type.");
    } catch (err) {
      setDefaultEngagementTypeCode(previous);
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
  const showPackages = activeTypeConfig.needsDiagnostic || activeTypeConfig.needsAssessment;
  const showCollection = activeTypeConfig.needsBloodCollection;
  const showConsultation = activeTypeConfig.needsConsultation;
  const showProfiles = activeTypeConfig.needsMetsights || activeTypeConfig.needsFitPrint;
  const showQuestionnaires = activeTypeConfig.needsAssessment;
  const showProfilesQuestionnairesRow = showProfiles || showQuestionnaires;
  const profileToggleCount =
    (activeTypeConfig.needsMetsights ? 1 : 0) + (activeTypeConfig.needsFitPrint ? 1 : 0);
  const profilesQuestionnairesToggleCount =
    profileToggleCount + (showQuestionnaires ? 1 : 0);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-100 bg-red-50 px-4 py-3" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsFormCard
        title="Default journey type"
        description="Fallback for new onboardings."
        success={fallbackSaveOk}
        saving={savingFallback}
        readOnly={!canEdit}
        showActions={false}
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="b2c-default-journey-type" className="sr-only">
            Default journey type
          </label>
          <select
            id="b2c-default-journey-type"
            className={inputClass}
            value={defaultEngagementTypeCode}
            onChange={(ev) => {
              void saveFallback(ev.target.value);
            }}
            disabled={!canEdit || savingFallback}
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

          <div className="flex-1 min-w-0">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{activeDisplayName} configuration</h3>
              {activeTypeHint ? <p className="text-xs text-zinc-500 mt-1">{activeTypeHint}</p> : null}
            </div>

            <div>
                  <ConfigSection title="Schedule">
                    <div className="max-w-xs">
                      <label
                        htmlFor="b2c-engagement-duration"
                        className="block text-sm font-medium text-zinc-700 mb-1"
                      >
                        Engagement duration (days)
                      </label>
                      <input
                        id="b2c-engagement-duration"
                        type="number"
                        min={1}
                        max={90}
                        className={inputClass}
                        value={activeDefaults.engagement_duration_days ?? 3}
                        onChange={(ev) =>
                          updateActiveDefaults({
                            engagement_duration_days: Math.min(
                              90,
                              Math.max(1, Number(ev.target.value) || 3)
                            ),
                          })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                  </ConfigSection>

                  {showPackages ? (
                    <ConfigSection title="Packages">
                      <div className="space-y-4">
                        {activeTypeConfig.needsDiagnostic ? (
                          <div className="space-y-4">
                            {!diagnosticSplitMode ? (
                              <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
                                <div>
                                  <p className="text-sm font-medium text-zinc-700 mb-1.5">
                                    Diagnostic packages
                                  </p>
                                  <SettingsSegmentedControl
                                    aria-label="Diagnostic packages"
                                    value="one"
                                    options={DIAGNOSTIC_PACKAGE_MODE_OPTIONS}
                                    disabled={!canEdit}
                                    onChange={(mode) => {
                                      if (mode === "split") {
                                        updateActiveDefaults({
                                          diagnostic_package_id: null,
                                          diagnostic_package_id_male:
                                            activeDefaults.diagnostic_package_id_male ??
                                            activeDefaults.diagnostic_package_id,
                                          diagnostic_package_id_female:
                                            activeDefaults.diagnostic_package_id_female,
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                <DiagnosticPackageGroupProviderSelect
                                  groups={diagnosticPackageGroups}
                                  value={activeDefaults.diagnostic_package_id}
                                  onChange={(id) =>
                                    updateActiveDefaults({ diagnostic_package_id: id })
                                  }
                                  bootstrapById={diagnosticBootstrapById}
                                  disabled={!canEdit}
                                  groupLabel="Default diagnostic package"
                                  emptyGroupLabel="None"
                                  emptyProviderLabel="Select provider"
                                  layout="row"
                                  className="contents"
                                />
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium text-zinc-700 mb-1.5">
                                    Diagnostic packages
                                  </p>
                                  <SettingsSegmentedControl
                                    aria-label="Diagnostic packages"
                                    value="split"
                                    options={DIAGNOSTIC_PACKAGE_MODE_OPTIONS}
                                    disabled={!canEdit}
                                    onChange={(mode) => {
                                      if (mode === "one") {
                                        updateActiveDefaults({
                                          diagnostic_package_id_male: null,
                                          diagnostic_package_id_female: null,
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <DiagnosticPackageGroupProviderSelect
                                    groups={diagnosticPackageGroups}
                                    value={activeDefaults.diagnostic_package_id_male}
                                    onChange={(id) =>
                                      updateActiveDefaults({
                                        diagnostic_package_id: null,
                                        diagnostic_package_id_male: id,
                                      })
                                    }
                                    bootstrapById={diagnosticBootstrapById}
                                    genderFilter="male"
                                    disabled={!canEdit}
                                    groupLabel="Male package"
                                    emptyGroupLabel="None"
                                    layout="row"
                                  />
                                  <DiagnosticPackageGroupProviderSelect
                                    groups={diagnosticPackageGroups}
                                    value={activeDefaults.diagnostic_package_id_female}
                                    onChange={(id) =>
                                      updateActiveDefaults({
                                        diagnostic_package_id: null,
                                        diagnostic_package_id_female: id,
                                      })
                                    }
                                    bootstrapById={diagnosticBootstrapById}
                                    genderFilter="female"
                                    disabled={!canEdit}
                                    groupLabel="Female package"
                                    emptyGroupLabel="None"
                                    layout="row"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {activeTypeConfig.needsAssessment ? (
                          <div>
                            <label
                              htmlFor="b2c-assessment"
                              className="block text-sm font-medium text-zinc-700 mb-1"
                            >
                              Default assessment package
                            </label>
                            <select
                              id="b2c-assessment"
                              className={inputClass}
                              value={activeDefaults.assessment_package_id || 0}
                              onChange={(ev) =>
                                updateActiveDefaults({
                                  assessment_package_id: Number(ev.target.value),
                                })
                              }
                              disabled={!canEdit}
                            >
                              <option value={0}>Select package</option>
                              {assessmentPackages.map((pkg) => {
                                const isPro =
                                  (pkg.package_code ?? "").trim() === METSIGHTS_PRO_PACKAGE_CODE;
                                const disabled =
                                  applySettingsProGate &&
                                  isPro &&
                                  activeProGate?.resolved &&
                                  !activeProGate.allowed;
                                return (
                                  <option
                                    key={pkg.package_id}
                                    value={pkg.package_id}
                                    disabled={disabled}
                                  >
                                    {labelAssessment(pkg)}
                                    {disabled
                                      ? " (needs LH, FSH, total testosterone on diagnostic package)"
                                      : ""}
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
                      </div>
                    </ConfigSection>
                  ) : null}

                  {showCollection ? (
                    <ConfigSection title="Collection">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">
                            Blood collection type
                          </label>
                          <select
                            className={inputClass}
                            value={activeDefaults.blood_collection_type ?? ""}
                            onChange={(ev) =>
                              updateActiveDefaults({
                                blood_collection_type: (ev.target.value ||
                                  null) as BloodCollectionType | null,
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
                          <label className="block text-sm font-medium text-zinc-700 mb-1">
                            Slot duration (minutes)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={480}
                            className={inputClass}
                            value={activeDefaults.slot_duration ?? 20}
                            onChange={(ev) =>
                              updateActiveDefaults({ slot_duration: Number(ev.target.value) })
                            }
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Auto booking
                          </span>
                          <SettingsSegmentedControl
                            aria-label="Auto booking"
                            value={boolToYesNo(Boolean(activeDefaults.auto_booking))}
                            options={YES_NO_OPTIONS}
                            disabled={!canEdit}
                            onChange={(v) =>
                              updateActiveDefaults({ auto_booking: yesNoToBool(v) })
                            }
                          />
                        </div>
                      </div>
                    </ConfigSection>
                  ) : null}

                  {showConsultation ? (
                    <ConfigSection title="Consultation">
                      <div className="max-w-sm">
                        <label className="block text-sm font-medium text-zinc-700 mb-1">
                          Consultation mode
                        </label>
                        <select
                          className={inputClass}
                          value={activeDefaults.consultation_mode ?? "online"}
                          onChange={(ev) =>
                            updateActiveDefaults({
                              consultation_mode: (ev.target.value || null) as
                                | "online"
                                | "offline"
                                | null,
                            })
                          }
                          disabled={!canEdit}
                        >
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                    </ConfigSection>
                  ) : null}

                  <ConfigSection title="Payment">
                    <div className="max-w-sm">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Payment type
                      </label>
                      <select
                        className={inputClass}
                        value={activeDefaults.payment_type ?? "paid_by_patient"}
                        onChange={(ev) =>
                          updateActiveDefaults({
                            payment_type: ev.target.value as
                              | "paid_by_patient"
                              | "paid_by_group",
                          })
                        }
                        disabled={!canEdit}
                      >
                        <option value="paid_by_patient">Paid by patient</option>
                        <option value="paid_by_group">Paid by group</option>
                      </select>
                      {activeDefaults.payment_type === "paid_by_group" ? (
                        <p className="text-xs text-amber-700 mt-1">
                          Patients will not be prompted for payment on onboard.
                        </p>
                      ) : null}
                    </div>
                  </ConfigSection>

                  {showProfilesQuestionnairesRow ? (
                    <section
                      data-testid="onboarding-section-profiles-questionnaires"
                      className="mt-6 space-y-3"
                    >
                      <div
                        className={`grid gap-4 ${
                          showProfiles && showQuestionnaires
                            ? profileToggleCount >= 2
                              ? "grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:divide-x sm:divide-zinc-200"
                              : "grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-zinc-200"
                            : "grid-cols-1"
                        }`}
                      >
                        {showProfiles ? (
                          <div data-testid="onboarding-section-profiles">
                            <CategoryHeading>Profiles</CategoryHeading>
                          </div>
                        ) : null}
                        {showQuestionnaires ? (
                          <div
                            data-testid="onboarding-section-questionnaires"
                            className={showProfiles ? "sm:pl-6" : ""}
                          >
                            <CategoryHeading>Questionnaires</CategoryHeading>
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={`grid gap-4 ${
                          profilesQuestionnairesToggleCount >= 3
                            ? "grid-cols-1 sm:grid-cols-3"
                            : profilesQuestionnairesToggleCount === 2
                              ? "grid-cols-1 sm:grid-cols-2"
                              : "grid-cols-1"
                        }`}
                      >
                        {activeTypeConfig.needsMetsights ? (
                          <div>
                            <span className="block text-sm font-medium text-zinc-700 mb-1.5">
                              Create profile on Metsights
                            </span>
                            <SettingsSegmentedControl
                              aria-label="Create profile on Metsights"
                              value={boolToYesNo(activeDefaults.create_profile_on_metsights)}
                              options={YES_NO_OPTIONS}
                              disabled={!canEdit}
                              onChange={(v) =>
                                updateActiveDefaults({
                                  create_profile_on_metsights: yesNoToBool(v),
                                })
                              }
                            />
                          </div>
                        ) : null}
                        {activeTypeConfig.needsFitPrint ? (
                          <div>
                            <span className="block text-sm font-medium text-zinc-700 mb-1.5">
                              Enroll for FitPrint Full
                            </span>
                            <SettingsSegmentedControl
                              aria-label="Enroll for FitPrint Full"
                              value={boolToYesNo(activeDefaults.enroll_for_fitprint_full)}
                              options={YES_NO_OPTIONS}
                              disabled={!canEdit}
                              onChange={(v) =>
                                updateActiveDefaults({
                                  enroll_for_fitprint_full: yesNoToBool(v),
                                })
                              }
                            />
                            {activeFitPrintInvalid ? (
                              <p className="text-xs text-red-600 mt-1">
                                FitPrint Full requires Metsights profile creation.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {showQuestionnaires ? (
                          <div>
                            <span className="block text-sm font-medium text-zinc-700 mb-1.5">
                              Load previous assessment questionnaires
                            </span>
                            <SettingsSegmentedControl
                              aria-label="Load previous assessment questionnaires"
                              value={boolToYesNo(
                                Boolean(activeDefaults.load_prev_assessment_questionnaires)
                              )}
                              options={YES_NO_OPTIONS}
                              disabled={!canEdit}
                              onChange={(v) => {
                                const enabled = yesNoToBool(v);
                                updateActiveDefaults({
                                  load_prev_assessment_questionnaires: enabled,
                                  ...(enabled
                                    ? {
                                        load_prev_questionnaire_category_keys:
                                          activeDefaults.load_prev_questionnaire_category_keys
                                            ?.length
                                            ? activeDefaults.load_prev_questionnaire_category_keys
                                            : [...DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS],
                                      }
                                    : {}),
                                });
                              }}
                            />
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
                                              checked={selectedLoadPrevCategoryKeys.includes(
                                                cat.category_key
                                              )}
                                              onChange={() =>
                                                toggleLoadPrevCategoryKey(cat.category_key)
                                              }
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
                        ) : null}
                      </div>
                    </section>
                  ) : null}
            </div>
          </div>
        </div>
      </SettingsFormCard>
    </div>
  );
}