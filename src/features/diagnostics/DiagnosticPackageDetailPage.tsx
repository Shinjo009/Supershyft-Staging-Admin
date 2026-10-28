import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Pencil } from "lucide-react";
import {
  HeaderActionButton,
  PageHeaderActions,
  usePageHeader,
} from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import {
  diagnosticPackagesApi,
  getApiError,
  type DiagnosticPackageDetail,
} from "../../lib/api";
import {
  DiagnosticPackageDetailContent,
  type PackageDetailTab,
} from "./DiagnosticPackageDetailContent";
import { diagnosticProviderDisplayLabel, isHealthiansProvider } from "./providerParameterKeys";
import { PackageProviderSwitcher } from "./PackageProviderSwitcher";

const BASE_TABS: { key: PackageDetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tests", label: "Tests" },
  { key: "samples-prep", label: "Samples & Prep" },
];

function parsePackageId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function DiagnosticPackageDetailPage() {
  const { packageId: packageIdParam } = useParams<{ packageId: string }>();
  const packageId = parsePackageId(packageIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detail, setDetail] = useState<DiagnosticPackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetailHeader = useCallback(async () => {
    if (!packageId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticPackagesApi.get(packageId);
      setDetail(res.data.data);
    } catch (err) {
      setError(getApiError(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void loadDetailHeader();
  }, [loadDetailHeader]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (isHealthiansProvider(detail?.diagnostic_provider)) {
      list.splice(2, 0, { key: "compare", label: "Compare" });
    }
    return list;
  }, [detail?.diagnostic_provider]);

  const tabFromUrl = searchParams.get("tab") as PackageDetailTab | null;

  const activeTab: PackageDetailTab = useMemo(() => {
    if (tabFromUrl && tabs.some((t) => t.key === tabFromUrl)) return tabFromUrl;
    return "overview";
  }, [tabFromUrl, tabs]);

  useEffect(() => {
    if (!tabFromUrl) return;
    if (!tabs.some((t) => t.key === tabFromUrl)) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        return next;
      });
    }
  }, [tabFromUrl, tabs, setSearchParams]);

  const setTab = (tab: PackageDetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  const headerConfig = useMemo(() => {
    if (!detail) return null;
    const status = (detail.status ?? "").toLowerCase() === "active" ? "Active" : "Inactive";
    const subtitle = [
      diagnosticProviderDisplayLabel(detail.diagnostic_provider),
      status,
      detail.no_of_tests != null ? `${detail.no_of_tests} tests` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: detail.package_name,
      subtitle,
      backTo: "/diagnostics/packages",
    };
  }, [detail]);

  usePageHeader(headerConfig);

  const openEdit = () => {
    if (!packageId) return;
    navigate(`/diagnostics/packages/${packageId}/edit`);
  };

  if (!packageId) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid package id.{" "}
        <Link to="/diagnostics/packages" className="underline">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl w-full mx-auto">
      {detail && (
        <PageHeaderActions>
          <PermissionGate category="diagnostics" action="edit">
            <HeaderActionButton label="Edit" icon={Pencil} onClick={openEdit} variant="secondary" />
          </PermissionGate>
        </PageHeaderActions>
      )}

      {detail && (
        <PackageProviderSwitcher
          currentPackageId={packageId}
          detail={detail}
          mode="view"
          onSetDefaultComplete={() => void loadDetailHeader()}
        />
      )}

      <div className="flex gap-1 mb-5 border-b border-zinc-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !detail ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
        </div>
      ) : error && !detail ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : (
        <DiagnosticPackageDetailContent
          packageId={packageId}
          activeTab={activeTab}
          onRequestTab={setTab}
          onUpdated={() => void loadDetailHeader()}
        />
      )}
    </div>
  );
}
