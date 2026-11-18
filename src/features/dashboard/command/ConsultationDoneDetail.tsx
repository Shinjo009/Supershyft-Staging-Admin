import { useCallback } from "react";
import { commandDashboardApi, type CommandPeriodParams } from "../../../lib/api";
import { JourneyPeopleDetail } from "./JourneyPeopleDetail";

export function ConsultationDoneDetail({
  periodParams,
  onBack,
}: {
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const fetchRows = useCallback(
    (params: CommandPeriodParams & { page: number; limit: number; include_rows: boolean }) =>
      commandDashboardApi.consultationDone(params),
    []
  );

  return (
    <JourneyPeopleDetail
      title="Consultation done"
      emptyLabel="No consultations done in this period."
      testId="detail-consultation_done"
      periodParams={periodParams}
      onBack={onBack}
      fetchRows={fetchRows}
    />
  );
}
