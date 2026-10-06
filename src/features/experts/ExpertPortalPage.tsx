import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ExpertPortalLayout } from "../../layouts/ExpertPortalLayout";
import { expertsPortalApi, getApiError, type ExpertDashboardPayload } from "../../lib/api";
import {
  DashboardSummaryCards,
  type DashboardViewAllKey,
} from "./dashboard/DashboardSummaryCards";
import { RequestsViewAllModal } from "./dashboard/RequestsViewAllModal";
import { TodaysConsultationsViewAllModal } from "./dashboard/TodaysConsultationsViewAllModal";
import { OpenCampsViewAllModal } from "./dashboard/OpenCampsViewAllModal";

type ViewAllModal = DashboardViewAllKey | null;

export function ExpertPortalPage() {
  const [data, setData] = useState<ExpertDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState<ViewAllModal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await expertsPortalApi.getDashboard();
      setData(res.data.data);
    } catch (err) {
      setError(getApiError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeViewAll = useCallback(() => setViewAll(null), []);

  return (
    <ExpertPortalLayout>
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : data ? (
          <>
            <DashboardSummaryCards summary={data.summary} onViewAll={setViewAll} />

            <RequestsViewAllModal open={viewAll === "requests"} onClose={closeViewAll} />
            <TodaysConsultationsViewAllModal
              open={viewAll === "today"}
              onClose={closeViewAll}
              items={data.todays_consultations}
            />
            <OpenCampsViewAllModal
              open={viewAll === "camps"}
              onClose={closeViewAll}
              items={data.open_camps}
            />
          </>
        ) : null}
      </div>
    </ExpertPortalLayout>
  );
}
