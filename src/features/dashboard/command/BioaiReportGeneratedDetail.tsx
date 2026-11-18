import { useCallback } from "react";
import { commandDashboardApi, type CommandPeriodParams } from "../../../lib/api";
import { JourneyPeopleDetail } from "./JourneyPeopleDetail";

export function BioaiReportGeneratedDetail({
  periodParams,
  onBack,
}: {
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const fetchRows = useCallback(
    (params: CommandPeriodParams & { page: number; limit: number; include_rows: boolean }) =>
      commandDashboardApi.bioaiReportGenerated(params),
    []
  );

  return (
    <JourneyPeopleDetail
      title="BioAI report generated"
      emptyLabel="No BioAI reports generated in this period."
      testId="detail-bioai_report_generated"
      periodParams={periodParams}
      onBack={onBack}
      fetchRows={fetchRows}
    />
  );
}
