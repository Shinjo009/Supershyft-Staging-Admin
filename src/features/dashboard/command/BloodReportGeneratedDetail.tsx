import { useCallback } from "react";
import { commandDashboardApi, type CommandPeriodParams } from "../../../lib/api";
import { JourneyPeopleDetail } from "./JourneyPeopleDetail";

export function BloodReportGeneratedDetail({
  periodParams,
  onBack,
}: {
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const fetchRows = useCallback(
    (params: CommandPeriodParams & { page: number; limit: number; include_rows: boolean }) =>
      commandDashboardApi.bloodReportGenerated(params),
    []
  );

  return (
    <JourneyPeopleDetail
      title="Blood report generated"
      emptyLabel="No blood reports generated in this period."
      testId="detail-blood_report_generated"
      periodParams={periodParams}
      onBack={onBack}
      fetchRows={fetchRows}
    />
  );
}
