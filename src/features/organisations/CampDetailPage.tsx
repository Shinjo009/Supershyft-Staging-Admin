import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Copy, Loader2 } from "lucide-react";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
import { CampReportInitMenu } from "../../shared/ui/CampReportInitMenu";
import {
  expertTypesApi,
  getApiError,
  organizationsApi,
  userOnboardingPayloadFieldsApi,
  type CampListItem,
  type CampOnboardingPayloadDocument,
  type ExpertTypeItem,
  type UserOnboardingPayloadFieldItem,
  type UserOnboardingPayloadSection,
} from "../../lib/api";
import { fetchAllPages } from "../../lib/fetchAllPages";

const SECTION_ORDER: UserOnboardingPayloadSection[] = [
  "personal_information",
  "address",
  "schedule",
];

const SECTION_LABELS: Record<UserOnboardingPayloadSection, string> = {
  personal_information: "Personal information",
  address: "Address",
  schedule: "Schedule",
};

function buildEditorState(
  catalog: UserOnboardingPayloadFieldItem[],
  expertTypes: ExpertTypeItem[],
  payload: CampOnboardingPayloadDocument | null | undefined
) {
  const required: Record<string, boolean> = {};
  const jsonExperts: Record<string, Record<string, boolean>> = {};
  for (const field of catalog) {
    const entry = payload?.[field.payload_key];
    required[field.payload_key] = entry?.required ?? false;
    if (field.input_type === "json") {
      jsonExperts[field.payload_key] = {};
      for (const expert of expertTypes) {
        jsonExperts[field.payload_key][expert.type_key] =
          entry?.sub_payload?.[expert.type_key] ?? false;
      }
    }
  }
  return { required, jsonExperts };
}

function buildPayloadDocument(
  catalog: UserOnboardingPayloadFieldItem[],
  expertTypes: ExpertTypeItem[],
  required: Record<string, boolean>,
  jsonExperts: Record<string, Record<string, boolean>>
): CampOnboardingPayloadDocument {
  const doc: CampOnboardingPayloadDocument = {};
  for (const field of catalog) {
    if (field.input_type === "json") {
      const sub: Record<string, boolean> = {};
      for (const expert of expertTypes) {
        sub[expert.type_key] = jsonExperts[field.payload_key]?.[expert.type_key] ?? false;
      }
      doc[field.payload_key] = {
        input_type: "json",
        required: required[field.payload_key] ?? false,
        sub_payload: sub,
      };
    } else {
      doc[field.payload_key] = {
        input_type: field.input_type,
        required: required[field.payload_key] ?? false,
        sub_payload: {},
      };
    }
  }
  return doc;
}

export function CampDetailPage() {
  const { campNo: campNoParam } = useParams<{ campNo: string }>();
  const campNo = Number(campNoParam);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [camp, setCamp] = useState<CampListItem | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [catalog, setCatalog] = useState<UserOnboardingPayloadFieldItem[]>([]);
  const [expertTypes, setExpertTypes] = useState<ExpertTypeItem[]>([]);
  const [required, setRequired] = useState<Record<string, boolean>>({});
  const [jsonExperts, setJsonExperts] = useState<Record<string, Record<string, boolean>>>({});
  const [initBusy, setInitBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [campCode, setCampCode] = useState<string | null>(null);
  const [campCodeCopied, setCampCodeCopied] = useState(false);

  const [changeCampNoOpen, setChangeCampNoOpen] = useState(false);
  const [changeCampNoValue, setChangeCampNoValue] = useState("");
  const [changeCampNoConfirm, setChangeCampNoConfirm] = useState<{
    newCampNo: number;
    existingCount: number;
  } | null>(null);
  const [changeCampNoBusy, setChangeCampNoBusy] = useState(false);
  const [changeCampNoError, setChangeCampNoError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (!Number.isInteger(campNo) || campNo <= 0) {
      setError("Invalid camp number");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [campRes, payloadRes, catalogRows, expertRes] = await Promise.all([
        organizationsApi.getCamp(campNo),
        organizationsApi.getCampOnboardingPayload(campNo),
        fetchAllPages<UserOnboardingPayloadFieldItem>((page, limit) =>
          userOnboardingPayloadFieldsApi.list({ page, limit })
        ),
        expertTypesApi.list(),
      ]);
      const campRow = campRes.data.data;
      const payloadState = payloadRes.data.data;
      const experts = expertRes.data.data ?? [];
      setCamp(campRow);
      setCatalog(catalogRows);
      setExpertTypes(experts);
      setInitialized(payloadState.initialized);
      setCampCode(payloadState.camp_code ?? null);
      const editor = buildEditorState(
        catalogRows,
        experts,
        payloadState.onboarding_payload ?? undefined
      );
      setRequired(editor.required);
      setJsonExperts(editor.jsonExperts);
    } catch (err) {
      setError(getApiError(err));
      setCamp(null);
    } finally {
      setLoading(false);
    }
  }, [campNo]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const headerConfig = useMemo(() => {
    if (!camp) return null;
    return {
      title: camp.camp_name || `Camp ${camp.camp_no}`,
      subtitle: `Camp No ${camp.camp_no} · ${camp.organization_name}`,
      backTo: "/organisations/camps",
    };
  }, [camp]);

  usePageHeader(headerConfig);

  const fieldsBySection = useMemo(() => {
    const grouped: Record<UserOnboardingPayloadSection, UserOnboardingPayloadFieldItem[]> = {
      personal_information: [],
      address: [],
      schedule: [],
    };
    for (const field of catalog) {
      grouped[field.section].push(field);
    }
    return grouped;
  }, [catalog]);

  const handleCopyCampCode = async () => {
    if (!campCode) return;
    try {
      await navigator.clipboard.writeText(campCode);
      setCampCodeCopied(true);
      window.setTimeout(() => setCampCodeCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleInitialize = async () => {
    setInitBusy(true);
    setSaveError(null);
    try {
      const res = await organizationsApi.initializeCampOnboardingPayload(campNo);
      setInitialized(res.data.data.initialized);
      setCampCode(res.data.data.camp_code ?? null);
      const editor = buildEditorState(catalog, expertTypes, res.data.data.onboarding_payload ?? {});
      setRequired(editor.required);
      setJsonExperts(editor.jsonExperts);
    } catch (err) {
      setSaveError(getApiError(err));
    } finally {
      setInitBusy(false);
    }
  };

  const handleSaveRequirements = async () => {
    setSaveBusy(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const document = buildPayloadDocument(catalog, expertTypes, required, jsonExperts);
      await organizationsApi.updateCampOnboardingPayload(campNo, document);
      setSaveMessage("Onboarding requirements saved");
    } catch (err) {
      setSaveError(getApiError(err));
    } finally {
      setSaveBusy(false);
    }
  };

  const submitChangeCampNo = async (forceConfirm = false) => {
    if (!camp) return;
    const parsed = Number(changeCampNoValue.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setChangeCampNoError("Enter a valid camp number");
      return;
    }
    if (parsed === camp.camp_no) {
      setChangeCampNoError("New camp number must be different");
      return;
    }
    setChangeCampNoBusy(true);
    setChangeCampNoError(null);
    try {
      if (!forceConfirm) {
        const countRes = await organizationsApi.getCampEngagementCount(parsed);
        const existingCount = countRes.data.data.engagement_count;
        if (existingCount > 0) {
          setChangeCampNoConfirm({ newCampNo: parsed, existingCount });
          return;
        }
      }
      await organizationsApi.remapCampNo(camp.camp_no, parsed);
      setChangeCampNoOpen(false);
      setChangeCampNoConfirm(null);
      navigate(`/organisations/camps/${parsed}`, { replace: true });
    } catch (err) {
      setChangeCampNoError(getApiError(err));
    } finally {
      setChangeCampNoBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !camp) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        {error ?? "Camp not found"}.{" "}
        <Link to="/organisations/camps" className="text-zinc-900 underline">
          Back to camps
        </Link>
      </div>
    );
  }

  const reportInitialized = camp.report_initialized === true;

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3 text-sm">
        <h2 className="text-base font-semibold text-zinc-900">Camp overview</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-zinc-500">Camp No:</span> {camp.camp_no}
          </div>
          {campCode ? (
            <div className="sm:col-span-2">
              <span className="text-zinc-500">Camp code:</span>{" "}
              <span className="font-mono text-zinc-900">{campCode}</span>
              <button
                type="button"
                onClick={() => void handleCopyCampCode()}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs font-medium hover:bg-zinc-100 align-middle"
                title="Copy camp code"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden />
                {campCodeCopied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}
          <div>
            <span className="text-zinc-500">Year:</span> {camp.year}
          </div>
          <div>
            <span className="text-zinc-500">Engagements:</span> {camp.engagement_ids.length}
          </div>
          <div>
            <span className="text-zinc-500">Departments:</span> {camp.departments.count}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <PermissionGate category="organizations" taskKey="camps" action="edit">
            <button
              type="button"
              onClick={() => {
                setChangeCampNoValue(String(camp.camp_no));
                setChangeCampNoError(null);
                setChangeCampNoConfirm(null);
                setChangeCampNoOpen(true);
              }}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Change camp_no
            </button>
          </PermissionGate>
          {!reportInitialized && (
            <PermissionGate category="reports" taskKey="camp_reports" action="edit">
              <CampReportInitMenu
                campNo={camp.camp_no}
                onFeedback={() => {
                  void loadPage();
                }}
                onInitialized={() => void loadPage()}
              />
            </PermissionGate>
          )}
          {reportInitialized && (
            <PermissionGate category="reports" taskKey="camp_reports" action="view">
              <Link
                to={`/organisations/camps/${camp.camp_no}/reports`}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Manage reports
              </Link>
            </PermissionGate>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">
          Camp / engagement onboarding requirements
        </h2>

        {!initialized ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Onboarding requirements have not been configured for this camp yet.
            </p>
            <PermissionGate category="organizations" taskKey="camps" action="edit">
              <button
                type="button"
                onClick={() => void handleInitialize()}
                disabled={initBusy}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                {initBusy ? "Starting…" : "Specify onboarding requirements"}
              </button>
            </PermissionGate>
          </div>
        ) : (
          <>
            {catalog.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No payload fields are defined in the catalog yet. Add fields from the camps list
                using Manage User Onboarding Payload Fields.
              </p>
            ) : (
              SECTION_ORDER.map((sectionKey) => {
                const rows = fieldsBySection[sectionKey];
                if (rows.length === 0) return null;
                return (
                  <div key={sectionKey} className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-800">{SECTION_LABELS[sectionKey]}</h3>
                    <ul className="space-y-4">
                      {rows.map((field) => (
                        <li key={field.id} className="border border-zinc-100 rounded-lg p-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={required[field.payload_key] ?? false}
                              onChange={(e) =>
                                setRequired((prev) => ({
                                  ...prev,
                                  [field.payload_key]: e.target.checked,
                                }))
                              }
                            />
                            <span>{field.display_name || field.payload_key}</span>
                          </label>
                          {field.input_type === "json" && (
                            <div className="mt-3 ml-6 space-y-2 border-l border-zinc-200 pl-4">
                              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                                Expert types
                              </p>
                              {expertTypes.map((expert) => (
                                <label key={expert.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={
                                      jsonExperts[field.payload_key]?.[expert.type_key] ?? false
                                    }
                                    onChange={(e) =>
                                      setJsonExperts((prev) => ({
                                        ...prev,
                                        [field.payload_key]: {
                                          ...(prev[field.payload_key] ?? {}),
                                          [expert.type_key]: e.target.checked,
                                        },
                                      }))
                                    }
                                  />
                                  <span>{expert.type}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}

            <PermissionGate category="organizations" taskKey="camps" action="edit">
              <button
                type="button"
                onClick={() => void handleSaveRequirements()}
                disabled={saveBusy || catalog.length === 0}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                {saveBusy ? "Saving…" : "Save requirements"}
              </button>
            </PermissionGate>
          </>
        )}

        {saveMessage && (
          <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">{saveMessage}</div>
        )}
        {saveError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{saveError}</div>
        )}
      </section>

      <Modal
        open={changeCampNoOpen}
        onClose={() => {
          if (changeCampNoBusy) return;
          setChangeCampNoOpen(false);
          setChangeCampNoConfirm(null);
          setChangeCampNoError(null);
        }}
        title="Change camp_no"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-3 text-sm">
          <p className="text-zinc-600">
            This updates camp_no on all engagements currently under camp{" "}
            <span className="font-medium text-zinc-900">{camp.camp_no}</span>.
          </p>
          <label className="block">
            <span className="text-zinc-500">New camp_no</span>
            <input
              type="number"
              value={changeCampNoValue}
              onChange={(e) => setChangeCampNoValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={changeCampNoBusy}
            />
          </label>
          {changeCampNoError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{changeCampNoError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={changeCampNoBusy}
              onClick={() => setChangeCampNoOpen(false)}
              className="px-3 py-2 rounded-lg border border-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={changeCampNoBusy}
              onClick={() => void submitChangeCampNo(false)}
              className="px-3 py-2 rounded-lg bg-zinc-900 text-white font-medium"
            >
              {changeCampNoBusy ? "Saving…" : "Update camp_no"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!changeCampNoConfirm}
        onClose={() => {
          if (changeCampNoBusy) return;
          setChangeCampNoConfirm(null);
        }}
        title="Confirm camp_no merge"
        maxWidthClassName="max-w-md"
      >
        {changeCampNoConfirm && (
          <div className="space-y-4 text-sm">
            <p className="text-zinc-600">
              Camp number{" "}
              <span className="font-medium text-zinc-900">{changeCampNoConfirm.newCampNo}</span> already
              has {changeCampNoConfirm.existingCount} engagement
              {changeCampNoConfirm.existingCount === 1 ? "" : "s"}. They will share the same camp_no
              after this update.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={changeCampNoBusy}
                onClick={() => setChangeCampNoConfirm(null)}
                className="px-3 py-2 rounded-lg border border-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={changeCampNoBusy}
                onClick={() => void submitChangeCampNo(true)}
                className="px-3 py-2 rounded-lg bg-zinc-900 text-white font-medium"
              >
                {changeCampNoBusy ? "Saving…" : "Confirm and update"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
