import { useCallback } from "react";
import { commandDashboardApi, type CommandPeriodParams } from "../../../lib/api";
import { JourneyPeopleDetail } from "./JourneyPeopleDetail";
import {
  ACTION_SUBCARD_ORDER,
  type ActionSubcardId,
} from "./period";

const FETCHERS: Record<
  ActionSubcardId,
  typeof commandDashboardApi.upcomingCollections
> = {
  upcoming_collections: commandDashboardApi.upcomingCollections,
  overdue_collections: commandDashboardApi.overdueCollections,
  questionnaire_pending: commandDashboardApi.questionnairePending,
  blood_reports_pending: commandDashboardApi.bloodReportsPending,
  bio_ai_pending: commandDashboardApi.bioaiPending,
  consultation_pending: commandDashboardApi.consultationPending,
};

export function ActionCenterDetail({
  subcard,
  periodParams,
  onBack,
}: {
  subcard: ActionSubcardId;
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const meta = ACTION_SUBCARD_ORDER.find((s) => s.id === subcard)!;
  const fetchApi = FETCHERS[subcard];
  const fetchRows = useCallback(
    (params: CommandPeriodParams & { page: number; limit: number; include_rows: boolean }) =>
      fetchApi(params),
    [fetchApi]
  );

  return (
    <JourneyPeopleDetail
      title={meta.title}
      emptyLabel={meta.emptyLabel}
      testId={`detail-action_center-${subcard}`}
      periodParams={periodParams}
      onBack={onBack}
      fetchRows={fetchRows}
    />
  );
}
