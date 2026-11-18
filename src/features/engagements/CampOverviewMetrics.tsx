import { useEffect, useState } from "react";
import {
  engagementsApi,
  getApiError,
  type Engagement,
  type EngagementDayWiseSummary,
  type EngagementProgressReport,
} from "../../lib/api";
import { CampProgressReport } from "./CampProgressReport";
import { DayWiseSummary } from "./DayWiseSummary";

export function CampOverviewMetrics({ engagement }: { engagement: Engagement }) {
  const [report, setReport] = useState<EngagementProgressReport | null>(null);
  const [summary, setSummary] = useState<EngagementDayWiseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [dayWiseError, setDayWiseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const engagementId = engagement.engagement_id;
    // Reset previous engagement snapshot before loading the new one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReport(null);
    setSummary(null);
    setProgressError(null);
    setDayWiseError(null);
    setLoading(true);

    void Promise.all([
      engagementsApi.progressReport(engagementId).then((res) => {
        if (!cancelled) setReport(res.data.data);
      }).catch((err) => {
        if (!cancelled) setProgressError(getApiError(err));
      }),
      engagementsApi.dayWiseSummary(engagementId).then((res) => {
        if (!cancelled) setSummary(res.data.data);
      }).catch((err) => {
        if (!cancelled) setDayWiseError(getApiError(err));
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [engagement.engagement_id]);

  return (
    <div
      data-testid="camp-overview-metrics"
      className="grid items-stretch gap-4 lg:grid-cols-3"
    >
      <div className="lg:col-span-2 min-h-0">
        <CampProgressReport report={report} loading={loading} error={progressError} />
      </div>
      <div className="min-h-0">
        <DayWiseSummary summary={summary} loading={loading} error={dayWiseError} />
      </div>
    </div>
  );
}
