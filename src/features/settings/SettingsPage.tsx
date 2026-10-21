import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Pause, Play, RefreshCw, Save, ScrollText, Search, Users } from "lucide-react";
import { DuplicatedUsersModal } from "./DuplicatedUsersModal";
import { MetsightsBloodMappingSection } from "./MetsightsBloodMappingSection";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildIntegrationLogsPath } from "../integration-logs/integrationSyncLogsUtils";
import { usePermissions } from "../../contexts/PermissionContext";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import type { SettingsTabKey } from "./Settings";
import { SettingsFormCard, SettingsSectionHeading, inputClass } from "./SettingsFormCard";
import {
  BLOOD_COLLECTION_TYPE_OPTIONS,
  buildDefaultsByType,
  formatCount,
  labelAssessment,
  labelDiagnostic,
  labelPartner,
  shortProfileId,
  totalPagesFromCount,
  type B2cDefaultsByType,
  emptyTypeDefaults,
} from "./settingsUtils";
import { getTypeConfig, getTypeHint } from "../engagements/engagementTypeConfig";
import {
  DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS,
  effectiveLoadPrevCategoryKeys,
} from "../engagements/loadPrevQuestionnaireDefaults";
import { questionnaireCategoriesApi, type QuestionnaireCategory } from "../../lib/api";
import {
  assessmentPackagesApi,
  diagnosticPackagesApi,
  partnersApi,
  engagementNotificationsApi,
  engagementTypesApi,
  notificationEventsApi,
  notificationsApi,
  platformSettingsApi,
  type AssessmentPackage,
  type B2cOnboardingTypeDefaults,
  type DiagnosticPackageListItem,
  type PartnerListItem,
  type EngagementTypeItem,
  type BloodCollectionType,
  type EngagementsSyncImportPageResult,
  type EngagementsSyncStats,
  type MetsightsProfilesImportPageResult,
  type MetsightsProfilesStats,
  type NotificationEventItem,
  type NotificationDefaultItem,
  type NotificationServiceConfigItem,
  type NotificationServiceItem,
  type SupportQueryNotification,
  type GeocodingProvider,
  getApiError,
} from "../../lib/api";
import { NotificationServiceChipInput } from "../../shared/ui/NotificationServiceChipInput";
import {
  NotificationEventServicesInput,
  normalizeNotificationServiceConfigs,
  validateNotificationServiceConfigs,
} from "../../shared/ui/NotificationEventServicesInput";
import { fetchAllPages } from "../../lib/fetchAllPages";

const SYNC_STORAGE_KEY = "metsights-sync-v1";
const ENG_SYNC_STORAGE_KEY = "engagements-sync-v1";

type SyncPhase = "idle" | "running" | "paused" | "completed" | "error";


interface SyncTotals {
  created: number;
  linked: number;
  skipped: number;
  failed: number;
}

interface EngSyncTotals {
  created: number;
  skipped: number;
  failed: number;
}

interface ProfileImportDetail {
  metsights_profile_id: string;
  reason: string;
}

interface PageLogEntry {
  page: number;
  created: number;
  linked: number;
  skipped: number;
  failed: number;
  at: string;
  skippedItems: ProfileImportDetail[];
  failures: ProfileImportDetail[];
}

interface EngPageLogEntry {
  page: number;
  created: number;
  skipped: number;
  failed: number;
  at: string;
  skippedItems: ProfileImportDetail[];
  failures: ProfileImportDetail[];
}

export function SettingsPage({ activeTab }: { activeTab: SettingsTabKey }) {
  const { canEditTask, canViewTask } = usePermissions();
  const mayEditSettings = canEditTask("platform_settings", "settings");
  const mayViewAssessments = canViewTask("assessments", "packages");
  const mayViewDiagnostics = canViewTask("diagnostics", "packages");
  const mayViewPartners = canViewTask("partners", "directory");
  const mayViewNotifications = canViewTask("notifications", "defaults");
  const mayEditNotifications = canEditTask("notifications", "defaults");
  const mayEditUsers = canEditTask("users", "profiles");
  const mayViewIntegrations = canViewTask("assessments", "integrations");
  const mayViewSystemMonitoring = canViewTask("system_monitoring", "audit_logs");
  const [searchParams, setSearchParams] = useSearchParams();
  const [defaultEngagementTypeCode, setDefaultEngagementTypeCode] = useState("bio_ai");
  const [savedDefaultEngagementTypeCode, setSavedDefaultEngagementTypeCode] = useState("bio_ai");
  const [loadPrevCategories, setLoadPrevCategories] = useState<QuestionnaireCategory[]>([]);
  const [savedDefaultAssistantIds, setSavedDefaultAssistantIds] = useState<Set<number>>(new Set());
  const [savedGeocodingProvider, setSavedGeocodingProvider] = useState<GeocodingProvider>("google");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const [assessmentPackages, setAssessmentPackages] = useState<AssessmentPackage[]>([]);
  const [diagnosticPackages, setDiagnosticPackages] = useState<DiagnosticPackageListItem[]>([]);

  const [b2cEngagementTypes, setB2cEngagementTypes] = useState<EngagementTypeItem[]>([]);
  const [activeEngagementType, setActiveEngagementType] = useState<string>("bio_ai");
  const [defaultsByType, setDefaultsByType] = useState<B2cDefaultsByType>(() => buildDefaultsByType(["bio_ai"], undefined));
  const [savedDefaultsByType, setSavedDefaultsByType] = useState<B2cDefaultsByType>(() =>
    buildDefaultsByType(["bio_ai"], undefined)
  );

  const [notificationServices, setNotificationServices] = useState<NotificationServiceItem[]>([]);

  const [notifTypes, setNotifTypes] = useState<EngagementTypeItem[]>([]);
  const [activeNotifType, setActiveNotifType] = useState<number | null>(null);
  const [notifEvents, setNotifEvents] = useState<NotificationEventItem[]>([]);
  const [notifEventsLoading, setNotifEventsLoading] = useState(false);
  const [notifDefaults, setNotifDefaults] = useState<Record<number, NotificationServiceConfigItem[]>>({});
  const [, setNotifDefaultsOriginal] = useState<Record<number, NotificationServiceConfigItem[]>>({});
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const notifDraftsRef = useRef<Record<number, Record<number, NotificationServiceConfigItem[]>>>({});
  const notifOriginalsRef = useRef<Record<number, Record<number, NotificationServiceConfigItem[]>>>({});

  const [defaultAssistantPartners, setDefaultAssistantPartners] = useState<PartnerListItem[]>([]);
  const [selectedDefaultAssistantIds, setSelectedDefaultAssistantIds] = useState<Set<number>>(new Set());
  const [defaultAssistantSearch, setDefaultAssistantSearch] = useState("");
  const [savingDefaultAssistants, setSavingDefaultAssistants] = useState(false);
  const [defaultAssistantsError, setDefaultAssistantsError] = useState<string | null>(null);
  const [defaultAssistantsSaveOk, setDefaultAssistantsSaveOk] = useState<string | null>(null);

  const [supportQueryNotification, setSupportQueryNotification] = useState<string | null>(null);
  const [savingSupportQueryNotification, setSavingSupportQueryNotification] = useState(false);
  const [supportQueryNotificationError, setSupportQueryNotificationError] = useState<string | null>(null);
  const [supportQueryNotificationSaveOk, setSupportQueryNotificationSaveOk] = useState<string | null>(null);

  const [geocodingProvider, setGeocodingProvider] = useState<GeocodingProvider>("google");
  const [savingGeocodingProvider, setSavingGeocodingProvider] = useState(false);
  const [geocodingProviderError, setGeocodingProviderError] = useState<string | null>(null);
  const [geocodingProviderSaveOk, setGeocodingProviderSaveOk] = useState<string | null>(null);

  const [msStats, setMsStats] = useState<MetsightsProfilesStats | null>(null);
  const [msStatsLoading, setMsStatsLoading] = useState(false);
  const [msStatsError, setMsStatsError] = useState<string | null>(null);

  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [nextPage, setNextPage] = useState(1);
  const [processedProfiles, setProcessedProfiles] = useState(0);
  const [metsightsTotal, setMetsightsTotal] = useState(0);
  const [pageSizeHint, setPageSizeHint] = useState(10);
  const [syncTotals, setSyncTotals] = useState<SyncTotals>({ created: 0, linked: 0, skipped: 0, failed: 0 });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const [activityLog, setActivityLog] = useState<PageLogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);
  const navigate = useNavigate();

  const pauseRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  const [engStats, setEngStats] = useState<EngagementsSyncStats | null>(null);
  const [engStatsLoading, setEngStatsLoading] = useState(false);
  const [engStatsError, setEngStatsError] = useState<string | null>(null);
  const [engSyncPhase, setEngSyncPhase] = useState<SyncPhase>("idle");
  const [engNextPage, setEngNextPage] = useState(1);
  const [engProcessedUsers, setEngProcessedUsers] = useState(0);
  const [engUsersTotal, setEngUsersTotal] = useState(0);
  const [engPageSizeHint, setEngPageSizeHint] = useState(10);
  const [engSyncTotals, setEngSyncTotals] = useState<EngSyncTotals>({ created: 0, skipped: 0, failed: 0 });
  const [engSyncError, setEngSyncError] = useState<string | null>(null);
  const [engFailedPage, setEngFailedPage] = useState<number | null>(null);
  const [engActivityLog, setEngActivityLog] = useState<EngPageLogEntry[]>([]);
  const [engLogOpen, setEngLogOpen] = useState(false);
  const engPauseRef = useRef(false);
  const engAbortRef = useRef<AbortController | null>(null);
  const engRunningRef = useRef(false);

  const loadB2cPickers = useCallback(async () => {
    try {
      const [notifServicesRes, aPkgs, dRes, partnersRes] = await Promise.all([
        mayViewNotifications ? notificationsApi.listServices() : Promise.resolve(null),
        mayViewAssessments
          ? fetchAllPages<AssessmentPackage>((page, limit) =>
              assessmentPackagesApi.list({ page, limit, status: "active" })
            )
          : Promise.resolve([]),
        mayViewDiagnostics ? diagnosticPackagesApi.list() : Promise.resolve(null),
        mayViewPartners
          ? fetchAllPages<PartnerListItem>((page, limit) =>
              partnersApi.list({ status: "active", role: "phlebo", page, limit })
            ).then((rows) => ({ data: { data: rows } }))
          : Promise.resolve(null),
      ]);
      setNotificationServices(
        (notifServicesRes?.data.data ?? []).filter((s) => s.is_active !== false)
      );
      setAssessmentPackages(aPkgs);
      setDefaultAssistantPartners(partnersRes?.data.data ?? []);
      const dPkgs = (dRes?.data.data ?? []).filter(
        (p) => (p.status ?? "active").toLowerCase() === "active"
      );
      setDiagnosticPackages(dPkgs);
    } catch {
      // Pickers are optional until a settings control needs them.
    }
  }, [mayViewAssessments, mayViewDiagnostics, mayViewPartners, mayViewNotifications]);

  const loadB2c = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveOk(null);
    try {
      const bootstrapRes = await platformSettingsApi.bootstrap();
      const payload = bootstrapRes.data.data;

      const types = payload.engagement_types ?? [];
      const typeCodes = types.map((t) => t.code);
      setB2cEngagementTypes(types);
      const typeFromUrl = searchParams.get("type")?.trim();
      const initialType =
        typeFromUrl && typeCodes.includes(typeFromUrl)
          ? typeFromUrl
          : typeCodes.includes("bio_ai")
            ? "bio_ai"
            : typeCodes[0] ?? "bio_ai";
      setActiveEngagementType(initialType);

      const d = payload.b2c_onboarding;
      const mapped = buildDefaultsByType(typeCodes, d.defaults_by_engagement_type);
      setDefaultsByType(mapped);
      setSavedDefaultsByType(mapped);
      const defaultType = d.default_engagement_type_code ?? "bio_ai";
      setDefaultEngagementTypeCode(defaultType);
      setSavedDefaultEngagementTypeCode(defaultType);
      const assistantIds = new Set(payload.default_onboarding_assistants.employee_ids ?? []);
      setSelectedDefaultAssistantIds(assistantIds);
      setSavedDefaultAssistantIds(new Set(assistantIds));
      const support = payload.support_query_notification?.default_support_query_notification ?? null;
      setSupportQueryNotification(support);
      const geo = payload.geocoding_provider?.geocoding_provider ?? "google";
      setGeocodingProvider(geo);
      setSavedGeocodingProvider(geo);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;
    void loadB2cPickers();
    questionnaireCategoriesApi
      .list()
      .then((res) => setLoadPrevCategories(res.data.data ?? []))
      .catch(() => setLoadPrevCategories([]));
  }, [loading, loadB2cPickers]);

  useEffect(() => {
    if (activeTab !== "onboarding") return;
    const code = activeEngagementType;
    if (!code) return;
    const current = searchParams.get("type");
    if (current === code) return;
    const next = new URLSearchParams(searchParams);
    next.set("type", code);
    setSearchParams(next, { replace: true });
  }, [activeEngagementType, activeTab, searchParams, setSearchParams]);

  const refreshMsStats = useCallback(async () => {
    setMsStatsLoading(true);
    setMsStatsError(null);
    try {
      const res = await platformSettingsApi.getMetsightsProfileStats();
      setMsStats(res.data.data);
      return res.data.data;
    } catch (err) {
      setMsStatsError(getApiError(err));
      return null;
    } finally {
      setMsStatsLoading(false);
    }
  }, []);

  const refreshEngStats = useCallback(async () => {
    setEngStatsLoading(true);
    setEngStatsError(null);
    try {
      const res = await platformSettingsApi.getEngagementsSyncStats();
      setEngStats(res.data.data);
      return res.data.data;
    } catch (err) {
      setEngStatsError(getApiError(err));
      return null;
    } finally {
      setEngStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadB2c();
    void refreshMsStats();
    void refreshEngStats();
  }, [loadB2c, refreshMsStats, refreshEngStats]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      engAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (syncPhase !== "running" && syncPhase !== "paused") return;
    try {
      sessionStorage.setItem(
        SYNC_STORAGE_KEY,
        JSON.stringify({
          nextPage,
          processedProfiles,
          metsightsTotal,
          syncTotals,
          syncPhase,
        })
      );
    } catch {
      /* ignore */
    }
  }, [syncPhase, nextPage, processedProfiles, metsightsTotal, syncTotals]);

  useEffect(() => {
    if (engSyncPhase !== "running" && engSyncPhase !== "paused") return;
    try {
      sessionStorage.setItem(
        ENG_SYNC_STORAGE_KEY,
        JSON.stringify({
          nextPage: engNextPage,
          processedUsers: engProcessedUsers,
          usersTotal: engUsersTotal,
          syncTotals: engSyncTotals,
          syncPhase: engSyncPhase,
        })
      );
    } catch {
      /* ignore */
    }
  }, [engSyncPhase, engNextPage, engProcessedUsers, engUsersTotal, engSyncTotals]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const invalidType = b2cEngagementTypes.find((option) => {
      const entry = defaultsByType[option.code];
      return entry?.enroll_for_fitprint_full && !entry.create_profile_on_metsights;
    });
    if (invalidType) {
      setError(
        `FitPrint Full enrollment requires Metsights profile creation (${invalidType.display_name}).`
      );
      setActiveEngagementType(invalidType.code);
      return;
    }
    setSaving(true);
    setError(null);
    setSaveOk(null);
    try {
      const res = await platformSettingsApi.patchB2cOnboarding({
        defaults_by_engagement_type: defaultsByType,
        default_engagement_type_code: defaultEngagementTypeCode,
      });
      const typeCodes = b2cEngagementTypes.map((t) => t.code);
      const mapped = buildDefaultsByType(typeCodes, res.data.data.defaults_by_engagement_type);
      setDefaultsByType(mapped);
      setSavedDefaultsByType(mapped);
      const savedDefaultType = res.data.data.default_engagement_type_code ?? defaultEngagementTypeCode;
      setDefaultEngagementTypeCode(savedDefaultType);
      setSavedDefaultEngagementTypeCode(savedDefaultType);
      setSaveOk("Saved. New B2C onboardings will use these per-type defaults.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function updateActiveDefaults(patch: Partial<B2cOnboardingTypeDefaults>) {
    setDefaultsByType((prev) => ({
      ...prev,
      [activeEngagementType]: { ...(prev[activeEngagementType] ?? emptyTypeDefaults()), ...patch },
    }));
  }

  const activeDefaults = defaultsByType[activeEngagementType] ?? emptyTypeDefaults();
  const isTypeDirty = (kind: string) =>
    JSON.stringify(defaultsByType[kind]) !== JSON.stringify(savedDefaultsByType[kind]);

  const onboardingDefaultsDirty =
    JSON.stringify(defaultsByType) !== JSON.stringify(savedDefaultsByType) ||
    defaultEngagementTypeCode !== savedDefaultEngagementTypeCode;

  const activeTypeConfig = getTypeConfig(activeEngagementType);
  const activeTypeHint = getTypeHint(activeEngagementType);
  const diagnosticSplitMode =
    (activeDefaults.diagnostic_package_id_male ?? 0) > 0 ||
    (activeDefaults.diagnostic_package_id_female ?? 0) > 0;

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

  function discardOnboardingDefaults() {
    setDefaultsByType({ ...savedDefaultsByType });
    setDefaultEngagementTypeCode(savedDefaultEngagementTypeCode);
    setError(null);
    setSaveOk(null);
  }

  async function handleSaveDefaultAssistants(e: React.FormEvent) {
    e.preventDefault();
    setSavingDefaultAssistants(true);
    setDefaultAssistantsError(null);
    setDefaultAssistantsSaveOk(null);
    try {
      await platformSettingsApi.patchDefaultOnboardingAssistants({
        employee_ids: Array.from(selectedDefaultAssistantIds),
      });
      setDefaultAssistantsSaveOk(
        "Saved. New B2B and B2C engagements will auto-assign these assistants."
      );
    } catch (err) {
      setDefaultAssistantsError(getApiError(err));
    } finally {
      setSavingDefaultAssistants(false);
    }
  }

  async function handleSaveSupportQueryNotification(e: React.FormEvent) {
    e.preventDefault();
    setSavingSupportQueryNotification(true);
    setSupportQueryNotificationError(null);
    setSupportQueryNotificationSaveOk(null);
    try {
      const payload: SupportQueryNotification = {
        default_support_query_notification: supportQueryNotification,
      };
      const res = await platformSettingsApi.patchSupportQueryNotification(payload);
      setSupportQueryNotification(res.data.data?.default_support_query_notification ?? null);
      setSupportQueryNotificationSaveOk(
        "Saved. Default onboarding assistants will be notified with these services when a support query is submitted."
      );
    } catch (err) {
      setSupportQueryNotificationError(getApiError(err));
    } finally {
      setSavingSupportQueryNotification(false);
    }
  }

  async function handleSaveGeocodingProvider(e: React.FormEvent) {
    e.preventDefault();
    setSavingGeocodingProvider(true);
    setGeocodingProviderError(null);
    setGeocodingProviderSaveOk(null);
    try {
      const res = await platformSettingsApi.patchGeocodingProvider({
        geocoding_provider: geocodingProvider,
      });
      setGeocodingProvider(res.data.data?.geocoding_provider ?? "google");
      setGeocodingProviderSaveOk("Saved. Address search will use this provider (with automatic fallback).");
    } catch (err) {
      setGeocodingProviderError(getApiError(err));
    } finally {
      setSavingGeocodingProvider(false);
    }
  }

  function toggleDefaultAssistantSelection(id: number) {
    setSelectedDefaultAssistantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredDefaultAssistantPartners = useMemo(() => {
    const q = defaultAssistantSearch.trim().toLowerCase();
    if (!q) return defaultAssistantPartners;
    return defaultAssistantPartners.filter((p) => {
      const name = labelPartner(p).toLowerCase();
      return (
        String(p.partner_id).includes(q) ||
        (p.role ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        name.includes(q)
      );
    });
  }, [defaultAssistantPartners, defaultAssistantSearch]);

  useEffect(() => {
    engagementTypesApi.list({ is_active: true }).then((res) => {
      const types = res.data.data ?? [];
      setNotifTypes(types);
      if (types.length > 0) setActiveNotifType(types[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeNotifType === null || !mayViewNotifications) return;
    let cancelled = false;
    setNotifEvents([]);
    setNotifEventsLoading(true);
    setNotifError(null);
    setNotifSuccess(false);

    const cached = notifDraftsRef.current[activeNotifType];
    if (cached) {
      setNotifDefaults(cached);
      setNotifDefaultsOriginal(notifOriginalsRef.current[activeNotifType] ?? cached);
      notificationEventsApi
        .list({ engagement_type_id: activeNotifType })
        .then((res) => {
          if (cancelled) return;
          setNotifEvents(res.data.data ?? []);
        })
        .catch((err) => {
          if (cancelled) return;
          setNotifError(getApiError(err));
        })
        .finally(() => {
          if (!cancelled) setNotifEventsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      notificationEventsApi.list({ engagement_type_id: activeNotifType }),
      engagementNotificationsApi.getDefaults(activeNotifType),
    ])
      .then(([eventsRes, defaultsRes]) => {
        if (cancelled) return;
        const events = Array.isArray(eventsRes.data.data) ? eventsRes.data.data : [];
        setNotifEvents(events);
        const defaults: Record<number, NotificationServiceConfigItem[]> = {};
        for (const ev of events) defaults[ev.notification_event_id] = [];
        const defaultsList = Array.isArray(defaultsRes.data.data)
          ? (defaultsRes.data.data as NotificationDefaultItem[])
          : [];
        for (const d of defaultsList) {
          defaults[d.notification_event_id] = normalizeNotificationServiceConfigs(
            d.notification_services
          );
        }
        setNotifDefaults(defaults);
        setNotifDefaultsOriginal({ ...defaults });
        notifDraftsRef.current[activeNotifType] = { ...defaults };
        notifOriginalsRef.current[activeNotifType] = { ...defaults };
      })
      .catch((err) => {
        if (cancelled) return;
        setNotifError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setNotifEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeNotifType, mayViewNotifications]);

  function isNotifTypeDirty(typeId: number): boolean {
    const draft = notifDraftsRef.current[typeId];
    const original = notifOriginalsRef.current[typeId];
    if (!draft || !original) return false;
    return JSON.stringify(draft) !== JSON.stringify(original);
  }

  function updateNotifDefault(eventId: number, value: NotificationServiceConfigItem[]) {
    setNotifDefaults((prev) => {
      const next = { ...prev, [eventId]: value };
      if (activeNotifType !== null) notifDraftsRef.current[activeNotifType] = next;
      return next;
    });
  }

  async function handleSaveNotifDefaults(e: React.FormEvent) {
    e.preventDefault();
    if (activeNotifType === null) return;
    setNotifSaving(true);
    setNotifError(null);
    setNotifSuccess(false);
    try {
      const payload = Object.entries(notifDefaults)
        .map(([eventId, services]) => ({
          notification_event_id: Number(eventId),
          notification_services: services.filter((item) => item.service_key.trim()),
        }))
        .filter((item) => item.notification_services.length > 0);

      for (const item of payload) {
        const validationError = validateNotificationServiceConfigs(
          item.notification_services,
          notificationServices
        );
        if (validationError) {
          setNotifError(validationError);
          return;
        }
      }

      await engagementNotificationsApi.upsertDefaults(activeNotifType, payload);
      setNotifDefaultsOriginal({ ...notifDefaults });
      notifOriginalsRef.current[activeNotifType] = { ...notifDefaults };
      setNotifSuccess(true);
    } catch (err) {
      setNotifError(getApiError(err));
    } finally {
      setNotifSaving(false);
    }
  }

  function applyPageResult(result: MetsightsProfilesImportPageResult) {
    if (result.metsights_total > 0) {
      setMetsightsTotal(result.metsights_total);
    }
    if (result.page_size > 0) {
      setPageSizeHint(result.page_size);
    }
    setProcessedProfiles((prev) => {
      const next = prev + result.page_size;
      return result.metsights_total > 0 ? Math.min(next, result.metsights_total) : next;
    });
    setSyncTotals((prev) => ({
      created: prev.created + result.created,
      linked: prev.linked + result.linked,
      skipped: prev.skipped + result.skipped,
      failed: prev.failed + result.failed,
    }));
    setActivityLog((prev) => {
      const entry: PageLogEntry = {
        page: result.page,
        created: result.created,
        linked: result.linked,
        skipped: result.skipped,
        failed: result.failed,
        at: new Date().toLocaleTimeString(),
        skippedItems: result.skipped_items ?? [],
        failures: result.failures ?? [],
      };
      return [entry, ...prev].slice(0, 15);
    });
  }

  const runSyncLoop = useCallback(
    async (startPage: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      pauseRef.current = false;
      setSyncError(null);
      setFailedPage(null);
      setSyncPhase("running");

      let page = startPage;
      const total = metsightsTotal || msStats?.metsights_total || 0;

      try {
        while (!pauseRef.current) {
          if (abortRef.current?.signal.aborted) break;

          const res = await platformSettingsApi.importMetsightsProfilesPage({ page });
          const result = res.data.data;
          applyPageResult(result);

          const remoteTotal = result.metsights_total || total;
          const pages = totalPagesFromCount(remoteTotal, result.page_size || pageSizeHint);
          const hasNext = result.metsights_next != null && result.metsights_next !== "";

          page += 1;
          setNextPage(page);

          if (!hasNext || (pages > 0 && page > pages)) {
            setSyncPhase("completed");
            await refreshMsStats();
            break;
          }
        }

        if (pauseRef.current) {
          setSyncPhase("paused");
          await refreshMsStats();
        }
      } catch (err) {
        if (abortRef.current?.signal.aborted) return;
        setSyncError(getApiError(err));
        setFailedPage(page);
        setSyncPhase("error");
      } finally {
        runningRef.current = false;
      }
    },
    [metsightsTotal, msStats?.metsights_total, pageSizeHint, refreshMsStats]
  );

  function handleLoad() {
    abortRef.current = new AbortController();
    setNextPage(1);
    setProcessedProfiles(0);
    setSyncTotals({ created: 0, linked: 0, skipped: 0, failed: 0 });
    setActivityLog([]);
    setSyncPhase("idle");
    const total = msStats?.metsights_total ?? 0;
    setMetsightsTotal(total);
    void runSyncLoop(1);
  }

  function handlePause() {
    pauseRef.current = true;
  }

  function handleResume() {
    if (syncPhase === "error" && failedPage != null) {
      void runSyncLoop(failedPage);
      return;
    }
    void runSyncLoop(nextPage);
  }

  function handleRetryPage() {
    if (failedPage == null || runningRef.current) return;
    setSyncPhase("running");
    setSyncError(null);
    void runSyncLoop(failedPage);
  }

  function applyEngPageResult(result: EngagementsSyncImportPageResult) {
    if (result.users_total > 0) {
      setEngUsersTotal(result.users_total);
    }
    if (result.page_size > 0) {
      setEngPageSizeHint(result.page_size);
    }
    setEngProcessedUsers((prev) => {
      const next = prev + (result.users_on_page || result.page_size);
      return result.users_total > 0 ? Math.min(next, result.users_total) : next;
    });
    setEngSyncTotals((prev) => ({
      created: prev.created + result.created,
      skipped: prev.skipped + result.skipped,
      failed: prev.failed + result.failed,
    }));
    setEngActivityLog((prev) => {
      const entry: EngPageLogEntry = {
        page: result.page,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        at: new Date().toLocaleTimeString(),
        skippedItems: result.skipped_items ?? [],
        failures: result.failures ?? [],
      };
      return [entry, ...prev].slice(0, 15);
    });
  }

  const runEngSyncLoop = useCallback(
    async (startPage: number) => {
      if (engRunningRef.current) return;
      engRunningRef.current = true;
      engPauseRef.current = false;
      setEngSyncError(null);
      setEngFailedPage(null);
      setEngSyncPhase("running");

      let page = startPage;
      const total = engUsersTotal || engStats?.users_with_metsights_profile_id || 0;

      try {
        while (!engPauseRef.current) {
          if (engAbortRef.current?.signal.aborted) break;

          const res = await platformSettingsApi.importEngagementsSyncPage({ page });
          const result = res.data.data;
          applyEngPageResult(result);

          const remoteTotal = result.users_total || total;
          const pages = totalPagesFromCount(remoteTotal, result.page_size || engPageSizeHint);
          const hasNext = result.next_page != null;

          page = result.next_page ?? page + 1;
          setEngNextPage(page);

          if (!hasNext || (pages > 0 && page > pages)) {
            setEngSyncPhase("completed");
            await refreshEngStats();
            break;
          }
        }

        if (engPauseRef.current) {
          setEngSyncPhase("paused");
          await refreshEngStats();
        }
      } catch (err) {
        if (engAbortRef.current?.signal.aborted) return;
        setEngSyncError(getApiError(err));
        setEngFailedPage(page);
        setEngSyncPhase("error");
      } finally {
        engRunningRef.current = false;
      }
    },
    [engUsersTotal, engStats?.users_with_metsights_profile_id, engPageSizeHint, refreshEngStats]
  );

  function handleEngLoad() {
    engAbortRef.current = new AbortController();
    setEngNextPage(1);
    setEngProcessedUsers(0);
    setEngSyncTotals({ created: 0, skipped: 0, failed: 0 });
    setEngActivityLog([]);
    setEngSyncPhase("idle");
    const total = engStats?.users_with_metsights_profile_id ?? 0;
    setEngUsersTotal(total);
    void runEngSyncLoop(1);
  }

  function handleEngPause() {
    engPauseRef.current = true;
  }

  function handleEngResume() {
    if (engSyncPhase === "error" && engFailedPage != null) {
      void runEngSyncLoop(engFailedPage);
      return;
    }
    void runEngSyncLoop(engNextPage);
  }

  function handleEngRetryPage() {
    if (engFailedPage == null || engRunningRef.current) return;
    setEngSyncPhase("running");
    setEngSyncError(null);
    void runEngSyncLoop(engFailedPage);
  }

  const progressTotal = metsightsTotal || msStats?.metsights_total || 0;
  const progressPct =
    progressTotal > 0 ? Math.min(100, Math.round((processedProfiles / progressTotal) * 100)) : 0;
  const totalPages = totalPagesFromCount(progressTotal, pageSizeHint);
  const currentPageDisplay = Math.max(1, nextPage - 1);
  const canLoad =
    syncPhase !== "running" && !msStatsLoading && (msStats?.metsights_total ?? 0) > 0 && !msStatsError;
  const isSyncing = syncPhase === "running";

  const engProgressTotal = engUsersTotal || engStats?.users_with_metsights_profile_id || 0;
  const engProgressPct =
    engProgressTotal > 0 ? Math.min(100, Math.round((engProcessedUsers / engProgressTotal) * 100)) : 0;
  const engTotalPages = totalPagesFromCount(engProgressTotal, engPageSizeHint);
  const engCurrentPageDisplay = Math.max(1, engNextPage - 1);
  const canEngLoad =
    engSyncPhase !== "running" &&
    !engStatsLoading &&
    (engStats?.users_with_metsights_profile_id ?? 0) > 0 &&
    !engStatsError;
  const isEngSyncing = engSyncPhase === "running";

  const assistantsDirty =
    JSON.stringify(Array.from(selectedDefaultAssistantIds).sort()) !==
    JSON.stringify(Array.from(savedDefaultAssistantIds).sort());

  const geocodingDirty = geocodingProvider !== savedGeocodingProvider;
  return (
    <div className="space-y-6">
      {!mayEditSettings && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Read-only access. You can view settings but not change them.
        </div>
      )}

      {activeTab === "integrations" && (
        <PageHeaderActions>
          {mayViewSystemMonitoring && (
            <HeaderActionButton
              label="Integration logs"
              icon={ScrollText}
              variant="secondary"
              onClick={() => navigate(buildIntegrationLogsPath())}
            />
          )}
        </PageHeaderActions>
      )}

      {activeTab === "onboarding" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <SettingsFormCard
                title="B2C onboarding defaults"
                description="Applies to new public, family, and admin-onboarded B2C users. Existing engagements are not changed."
                error={error}
                success={saveOk}
                dirty={onboardingDefaultsDirty}
                saving={saving}
                readOnly={!mayEditSettings}
                saveLabel="Save defaults"
                onSubmit={handleSave}
                onDiscard={discardOnboardingDefaults}
              >
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Default engagement type when omitted
                  </label>
                  <select
                    className={inputClass}
                    value={defaultEngagementTypeCode}
                    onChange={(ev) => setDefaultEngagementTypeCode(ev.target.value)}
                    disabled={!mayEditSettings}
                  >
                    {b2cEngagementTypes.map((t) => (
                      <option key={t.code} value={t.code}>{t.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2">
                  {b2cEngagementTypes.map((option) => {
                    const active = activeEngagementType === option.code;
                    const dirty = isTypeDirty(option.code);
                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => setActiveEngagementType(option.code)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                          active
                            ? "border-zinc-900 text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-700"
                        }`}
                      >
                        {option.display_name}
                        {dirty ? <span className="ml-1 opacity-70">•</span> : null}
                      </button>
                    );
                  })}
                </div>
                {activeTypeHint ? <p className="text-xs text-zinc-500">{activeTypeHint}</p> : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsSectionHeading>Packages</SettingsSectionHeading>
                  {activeTypeConfig.needsAssessment ? (
                    <div className="sm:col-span-2">
                      <label htmlFor="b2c-assessment" className="block text-sm font-medium text-zinc-700 mb-1">
                        Default assessment package
                      </label>
                      <select
                        id="b2c-assessment"
                        className={inputClass}
                        value={activeDefaults.assessment_package_id}
                        onChange={(ev) => updateActiveDefaults({ assessment_package_id: Number(ev.target.value) })}
                        disabled={!mayEditSettings}
                      >
                        {assessmentPackages.map((pkg) => (
                          <option key={pkg.package_id} value={pkg.package_id}>{labelAssessment(pkg)}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

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
                            disabled={!mayEditSettings}
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
                                diagnostic_package_id_male: activeDefaults.diagnostic_package_id_male ?? activeDefaults.diagnostic_package_id,
                                diagnostic_package_id_female: activeDefaults.diagnostic_package_id_female,
                              })
                            }
                            disabled={!mayEditSettings}
                          />
                          Male and female packages
                        </label>
                      </div>
                      {!diagnosticSplitMode ? (
                        <select
                          className={inputClass}
                          value={activeDefaults.diagnostic_package_id ?? ""}
                          onChange={(ev) =>
                            updateActiveDefaults({
                              diagnostic_package_id: ev.target.value ? Number(ev.target.value) : null,
                            })
                          }
                          disabled={!mayEditSettings}
                        >
                          <option value="">None</option>
                          {diagnosticPackages.map((pkg) => (
                            <option key={pkg.diagnostic_package_id} value={pkg.diagnostic_package_id}>
                              {labelDiagnostic(pkg)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Male package</label>
                            <select
                              className={inputClass}
                              value={activeDefaults.diagnostic_package_id_male ?? ""}
                              onChange={(ev) =>
                                updateActiveDefaults({
                                  diagnostic_package_id: null,
                                  diagnostic_package_id_male: ev.target.value ? Number(ev.target.value) : null,
                                })
                              }
                              disabled={!mayEditSettings}
                            >
                              <option value="">None</option>
                              {diagnosticPackages.map((pkg) => (
                                <option key={pkg.diagnostic_package_id} value={pkg.diagnostic_package_id}>
                                  {labelDiagnostic(pkg)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Female package</label>
                            <select
                              className={inputClass}
                              value={activeDefaults.diagnostic_package_id_female ?? ""}
                              onChange={(ev) =>
                                updateActiveDefaults({
                                  diagnostic_package_id: null,
                                  diagnostic_package_id_female: ev.target.value ? Number(ev.target.value) : null,
                                })
                              }
                              disabled={!mayEditSettings}
                            >
                              <option value="">None</option>
                              {diagnosticPackages.map((pkg) => (
                                <option key={pkg.diagnostic_package_id} value={pkg.diagnostic_package_id}>
                                  {labelDiagnostic(pkg)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
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
                          disabled={!mayEditSettings}
                        >
                          {BLOOD_COLLECTION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value || "none"} value={option.value}>{option.label}</option>
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
                          disabled={!mayEditSettings}
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
                                disabled={!mayEditSettings}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                              <input
                                type="radio"
                                checked={!activeDefaults.auto_booking}
                                onChange={() => updateActiveDefaults({ auto_booking: false })}
                                disabled={!mayEditSettings}
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
                          disabled={!mayEditSettings}
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
                      disabled={!mayEditSettings}
                    >
                      <option value="paid_by_patient">Paid by patient</option>
                      <option value="paid_by_group">Paid by group</option>
                    </select>
                    {activeDefaults.payment_type === "paid_by_group" ? (
                      <p className="text-xs text-amber-700 mt-1">Patients will not be prompted for payment on onboard.</p>
                    ) : null}
                  </div>

                  <SettingsSectionHeading>Profiles</SettingsSectionHeading>
                  {(activeTypeConfig.needsMetsights || activeTypeConfig.needsFitPrint) ? (
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
                                disabled={!mayEditSettings}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                              <input
                                type="radio"
                                checked={!activeDefaults.create_profile_on_metsights}
                                onChange={() => updateActiveDefaults({ create_profile_on_metsights: false })}
                                disabled={!mayEditSettings}
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
                                disabled={!mayEditSettings}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                              <input
                                type="radio"
                                checked={!activeDefaults.enroll_for_fitprint_full}
                                onChange={() => updateActiveDefaults({ enroll_for_fitprint_full: false })}
                                disabled={!mayEditSettings}
                              />
                              No
                            </label>
                          </div>
                          {activeDefaults.enroll_for_fitprint_full && !activeDefaults.create_profile_on_metsights ? (
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
                              disabled={!mayEditSettings}
                            />
                            Yes
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="radio"
                              checked={!activeDefaults.load_prev_assessment_questionnaires}
                              onChange={() =>
                                updateActiveDefaults({ load_prev_assessment_questionnaires: false })
                              }
                              disabled={!mayEditSettings}
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
                                      <label key={cat.category_id} className="inline-flex items-center gap-2 text-sm text-zinc-700">
                                        <input
                                          type="checkbox"
                                          checked={selectedLoadPrevCategoryKeys.includes(cat.category_key)}
                                          onChange={() => toggleLoadPrevCategoryKey(cat.category_key)}
                                          disabled={!mayEditSettings}
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
              </SettingsFormCard>

              <SettingsFormCard
                title="Default onboarding assistants"
                description="Auto-assigned when new B2B or B2C engagements are created. Select active phlebo partners."
                error={defaultAssistantsError}
                success={defaultAssistantsSaveOk}
                dirty={assistantsDirty}
                saving={savingDefaultAssistants}
                readOnly={!mayEditSettings}
                saveLabel="Save assistants"
                onSubmit={(e) => void handleSaveDefaultAssistants(e)}
                onDiscard={() => {
                  setSelectedDefaultAssistantIds(new Set(savedDefaultAssistantIds));
                  setDefaultAssistantsError(null);
                  setDefaultAssistantsSaveOk(null);
                }}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="search"
                    placeholder="Search by name, phone, or ID…"
                    value={defaultAssistantSearch}
                    onChange={(ev) => setDefaultAssistantSearch(ev.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    disabled={!mayEditSettings}
                  />
                </div>
                {defaultAssistantPartners.length === 0 ? (
                  <p className="text-sm text-zinc-500">No active phlebo partners found.</p>
                ) : filteredDefaultAssistantPartners.length === 0 ? (
                  <p className="text-sm text-zinc-500">No phlebos match your search.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    {filteredDefaultAssistantPartners.map((partner) => {
                      const checked = selectedDefaultAssistantIds.has(partner.partner_id);
                      return (
                        <li
                          key={partner.partner_id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 ${checked ? "bg-zinc-50" : "bg-white"}`}
                          onClick={() => mayEditSettings && toggleDefaultAssistantSelection(partner.partner_id)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDefaultAssistantSelection(partner.partner_id)}
                            onClick={(ev) => ev.stopPropagation()}
                            disabled={!mayEditSettings}
                            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{labelPartner(partner)}</p>
                            <p className="text-xs text-zinc-500 truncate">{partner.phone || partner.email || "Phlebo"}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-xs text-zinc-500">Selected: {selectedDefaultAssistantIds.size}</p>
              </SettingsFormCard>
            </>
          )}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
      {!loading ? (
        <form
          onSubmit={(e) => void handleSaveSupportQueryNotification(e)}
          className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Support alerts</h2>
          <p className="text-xs text-zinc-500 -mt-2">
            Notification services used to alert default onboarding assistants when a support
            query is submitted.
          </p>

          <NotificationServiceChipInput
            label="Support query notification"
            value={supportQueryNotification}
            onChange={setSupportQueryNotification}
            services={notificationServices}
          />

          {supportQueryNotificationError ? (
            <p className="text-sm text-red-600" role="alert">
              {supportQueryNotificationError}
            </p>
          ) : null}
          {supportQueryNotificationSaveOk ? (
            <p className="text-sm text-emerald-700">{supportQueryNotificationSaveOk}</p>
          ) : null}

          <button
            type="submit"
            disabled={savingSupportQueryNotification}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {savingSupportQueryNotification ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save support notification
          </button>
        </form>
      ) : null}

      {!loading ? (
        <form
          onSubmit={(e) => void handleSaveNotifDefaults(e)}
          onSubmitCapture={mayEditNotifications ? undefined : (event) => event.preventDefault()}
          onChangeCapture={mayEditNotifications ? undefined : (event) => event.stopPropagation()}
          className={`bg-white border border-zinc-200 rounded-xl p-5 space-y-4 ${
            mayEditNotifications
              ? ""
              : "[&_button]:hidden [&_input]:pointer-events-none [&_select]:pointer-events-none"
          }`}
        >
          <h2 className="text-sm font-semibold text-zinc-900">Engagement notification defaults</h2>
          <p className="text-xs text-zinc-500 -mt-2">
            Configure default notification services for each engagement type. These are auto-applied
            when creating new engagements.
          </p>

          {notifTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2">
              {notifTypes.map((t) => {
                const active = activeNotifType === t.id;
                const dirty = isNotifTypeDirty(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveNotifType(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    {t.display_name}
                    {dirty ? <span className="ml-1 opacity-70">•</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Loading engagement types…</p>
          )}

          {activeNotifType !== null && notifEventsLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading events…
            </div>
          ) : activeNotifType !== null && notifEvents.length > 0 ? (
            <div className="space-y-4">
              {notifEvents.map((ev) => (
                <NotificationEventServicesInput
                  key={ev.notification_event_id}
                  label={ev.display_name}
                  value={notifDefaults[ev.notification_event_id] ?? []}
                  onChange={(next) => updateNotifDefault(ev.notification_event_id, next)}
                  services={notificationServices}
                />
              ))}
            </div>
          ) : activeNotifType !== null ? (
            <p className="text-sm text-zinc-500 py-2">
              No notification events are linked to this engagement type. Add or update events under
              Library → Notifications → Events, then return here to set defaults.
            </p>
          ) : null}

          {notifError ? (
            <p className="text-sm text-red-600" role="alert">
              {notifError}
            </p>
          ) : null}
          {notifSuccess ? (
            <p className="text-sm text-emerald-700">
              Saved. New engagements will use these notification defaults.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={notifSaving || notifEventsLoading || activeNotifType === null || notifEvents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {notifSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save notification defaults
          </button>
        </form>
      ) : null}
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-6">
      <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Metsights profile sync</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-lg">
              Import participant profiles from Metsights into local users. Profiles that already have a matching{" "}
              <code className="bg-zinc-100 px-1 rounded">metsights_profile_id</code> are skipped. Existing users with
              the same phone (with or without +91) are linked and receive the Metsights profile id. If that user already
              has a different Metsights profile id, a sub-profile is created instead.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshMsStats()}
            disabled={msStatsLoading || isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {msStatsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh stats
          </button>
        </div>

        {msStatsError ? (
          <p className="text-sm text-red-600" role="alert">
            {msStatsError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Local users", value: msStats?.local_total_users },
            { label: "Linked (synced)", value: msStats?.local_with_metsights_profile_id },
            { label: "Without Metsights ID", value: msStats?.local_without_metsights_profile_id },
            { label: "Metsights total", value: msStats?.metsights_total },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">{tile.label}</p>
              <p className="text-lg font-semibold text-zinc-900 mt-0.5 tabular-nums">
                {msStatsLoading ? "…" : formatCount(tile.value)}
              </p>
            </div>
          ))}
        </div>

        {msStats && msStats.estimated_not_imported > 0 ? (
          <p className="text-xs text-zinc-500">
            ~{formatCount(msStats.estimated_not_imported)} Metsights profiles may still need import (estimate).
          </p>
        ) : null}

        {(isSyncing || syncPhase === "paused" || syncPhase === "completed" || syncPhase === "error") &&
        processedProfiles > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-600">
              <span>
                {formatCount(processedProfiles)} / {formatCount(progressTotal)} profiles
              </span>
              <span>
                Page {currentPageDisplay}
                {totalPages > 0 ? ` of ~${totalPages}` : ""}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              Created {syncTotals.created} · Linked {syncTotals.linked} · Skipped {syncTotals.skipped} · Failed{" "}
              {syncTotals.failed}
            </p>
          </div>
        ) : null}

        {syncPhase === "completed" ? (
          <p className="text-sm text-emerald-700">Import completed.</p>
        ) : null}
        {syncPhase === "paused" ? (
          <p className="text-sm text-amber-700">Paused. Resume to continue from page {nextPage}.</p>
        ) : null}
        {syncError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-red-600" role="alert">
              {syncError}
            </p>
            {failedPage != null ? (
              <button
                type="button"
                onClick={handleRetryPage}
                className="text-xs font-medium text-zinc-700 underline hover:text-zinc-900"
              >
                Retry page {failedPage}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoad}
            disabled={!canLoad}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Load
          </button>
          <button
            type="button"
            onClick={handlePause}
            disabled={!isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
          <button
            type="button"
            onClick={handleResume}
            disabled={syncPhase !== "paused" && syncPhase !== "error"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        </div>

        {activityLog.length > 0 ? (
          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setLogOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              {logOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Activity log ({activityLog.length})
            </button>
            {logOpen ? (
              <ul className="mt-2 space-y-3 max-h-64 overflow-y-auto text-xs text-zinc-600">
                {activityLog.map((entry) => (
                  <li key={`${entry.page}-${entry.at}`} className="space-y-1">
                    <p>
                      <span className="text-zinc-400">{entry.at}</span> Page {entry.page}: {entry.created} created,{" "}
                      {entry.linked} linked, {entry.skipped} skipped, {entry.failed} failed
                    </p>
                    {entry.skippedItems.length > 0 ? (
                      <ul className="ml-3 pl-2 border-l border-amber-200 space-y-0.5">
                        {entry.skippedItems.map((item) => (
                          <li key={`skip-${entry.page}-${item.metsights_profile_id}`} className="text-amber-800/90">
                            <span className="font-mono text-[10px] text-amber-700/80">
                              {shortProfileId(item.metsights_profile_id)}
                            </span>
                            {" — "}
                            {item.reason}
                          </li>
                        ))}
                        {entry.skipped > entry.skippedItems.length ? (
                          <li className="text-zinc-400 italic">
                            +{entry.skipped - entry.skippedItems.length} more skipped (not listed)
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    {entry.failures.length > 0 ? (
                      <ul className="ml-3 pl-2 border-l border-red-200 space-y-0.5">
                        {entry.failures.map((item) => (
                          <li key={`fail-${entry.page}-${item.metsights_profile_id}`} className="text-red-700/90">
                            <span className="font-mono text-[10px] text-red-600/80">
                              {shortProfileId(item.metsights_profile_id)}
                            </span>
                            {" — "}
                            {item.reason}
                          </li>
                        ))}
                        {entry.failed > entry.failures.length ? (
                          <li className="text-zinc-400 italic">
                            +{entry.failed - entry.failures.length} more failed (not listed)
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Engagements sync</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-lg">
              For each local user with a{" "}
              <code className="bg-zinc-100 px-1 rounded">metsights_profile_id</code>, fetch MetSights records and
              create B2C engagements, participants, and assessment instances. FitPrint records and already-imported{" "}
              <code className="bg-zinc-100 px-1 rounded">metsights_record_id</code> values are skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshEngStats()}
            disabled={engStatsLoading || isEngSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {engStatsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh stats
          </button>
        </div>

        {engStatsError ? (
          <p className="text-sm text-red-600" role="alert">
            {engStatsError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            { label: "Current Total users Engagements", value: engStats?.b2c_engagements_total },
            { label: "Users with Metsights ID", value: engStats?.users_with_metsights_profile_id },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">{tile.label}</p>
              <p className="text-lg font-semibold text-zinc-900 mt-0.5 tabular-nums">
                {engStatsLoading ? "…" : formatCount(tile.value)}
              </p>
            </div>
          ))}
        </div>

        {(isEngSyncing || engSyncPhase === "paused" || engSyncPhase === "completed" || engSyncPhase === "error") &&
        engProcessedUsers > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-600">
              <span>
                {formatCount(engProcessedUsers)} / {formatCount(engProgressTotal)} users
              </span>
              <span>
                Page {engCurrentPageDisplay}
                {engTotalPages > 0 ? ` of ~${engTotalPages}` : ""}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-300 ease-out"
                style={{ width: `${engProgressPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              Created {engSyncTotals.created} · Skipped {engSyncTotals.skipped} · Failed {engSyncTotals.failed}
            </p>
          </div>
        ) : null}

        {engSyncPhase === "completed" ? (
          <p className="text-sm text-emerald-700">Engagements sync completed.</p>
        ) : null}
        {engSyncPhase === "paused" ? (
          <p className="text-sm text-amber-700">Paused. Resume to continue from page {engNextPage}.</p>
        ) : null}
        {engSyncError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-red-600" role="alert">
              {engSyncError}
            </p>
            {engFailedPage != null ? (
              <button
                type="button"
                onClick={handleEngRetryPage}
                className="text-xs font-medium text-zinc-700 underline hover:text-zinc-900"
              >
                Retry page {engFailedPage}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEngLoad}
            disabled={!canEngLoad}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isEngSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Load
          </button>
          <button
            type="button"
            onClick={handleEngPause}
            disabled={!isEngSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
          <button
            type="button"
            onClick={handleEngResume}
            disabled={engSyncPhase !== "paused" && engSyncPhase !== "error"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        </div>

        {engActivityLog.length > 0 ? (
          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setEngLogOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              {engLogOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Activity log ({engActivityLog.length})
            </button>
            {engLogOpen ? (
              <ul className="mt-2 space-y-3 max-h-64 overflow-y-auto text-xs text-zinc-600">
                {engActivityLog.map((entry) => (
                  <li key={`${entry.page}-${entry.at}`} className="space-y-1">
                    <p>
                      <span className="text-zinc-400">{entry.at}</span> Page {entry.page}: {entry.created} created,{" "}
                      {entry.skipped} skipped, {entry.failed} failed
                    </p>
                    {entry.skippedItems.length > 0 ? (
                      <ul className="ml-3 pl-2 border-l border-amber-200 space-y-0.5">
                        {entry.skippedItems.map((item) => (
                          <li key={`eng-skip-${entry.page}-${item.metsights_profile_id}-${item.reason}`} className="text-amber-800/90">
                            <span className="font-mono text-[10px] text-amber-700/80">
                              {shortProfileId(item.metsights_profile_id)}
                            </span>
                            {" — "}
                            {item.reason}
                          </li>
                        ))}
                        {entry.skipped > entry.skippedItems.length ? (
                          <li className="text-zinc-400 italic">
                            +{entry.skipped - entry.skippedItems.length} more skipped (not listed)
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    {entry.failures.length > 0 ? (
                      <ul className="ml-3 pl-2 border-l border-red-200 space-y-0.5">
                        {entry.failures.map((item) => (
                          <li key={`eng-fail-${entry.page}-${item.metsights_profile_id}-${item.reason}`} className="text-red-700/90">
                            <span className="font-mono text-[10px] text-red-600/80">
                              {shortProfileId(item.metsights_profile_id)}
                            </span>
                            {" — "}
                            {item.reason}
                          </li>
                        ))}
                        {entry.failed > entry.failures.length ? (
                          <li className="text-zinc-400 italic">
                            +{entry.failed - entry.failures.length} more failed (not listed)
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {mayViewIntegrations ? <MetsightsBloodMappingSection /> : null}
        </div>
      )}

      {activeTab === "platform" && (
        <div className="space-y-6">
          <SettingsFormCard
            title="Geocoding provider"
            description="Primary provider for address search. If the primary returns no results or errors, the other provider is tried automatically."
            error={geocodingProviderError}
            success={geocodingProviderSaveOk}
            dirty={geocodingDirty}
            saving={savingGeocodingProvider}
            readOnly={!mayEditSettings}
            saveLabel="Save geocoding provider"
            onSubmit={(e) => void handleSaveGeocodingProvider(e)}
            onDiscard={() => {
              setGeocodingProvider(savedGeocodingProvider);
              setGeocodingProviderError(null);
              setGeocodingProviderSaveOk(null);
            }}
          >
            <div className="flex gap-5 py-2">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="geocoding-provider"
                  checked={geocodingProvider === "google"}
                  onChange={() => setGeocodingProvider("google")}
                  disabled={!mayEditSettings}
                />
                Google
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="geocoding-provider"
                  checked={geocodingProvider === "nominatim"}
                  onChange={() => setGeocodingProvider("nominatim")}
                  disabled={!mayEditSettings}
                />
                Nominatim (OpenStreetMap)
              </label>
            </div>
          </SettingsFormCard>

          {mayEditUsers ? (
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-900">Users</h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-lg">
                Find accounts that share the same phone number and remove duplicates.
              </p>
              <button
                type="button"
                onClick={() => setDuplicatesModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
              >
                <Users className="w-4 h-4" />
                Duplicated users
              </button>
            </section>
          ) : null}
        </div>
      )}


      {mayEditUsers && <DuplicatedUsersModal open={duplicatesModalOpen} onClose={() => setDuplicatesModalOpen(false)} />}
    </div>
  );
}
