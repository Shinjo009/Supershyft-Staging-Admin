import type { EngagementDataCompletenessResponse } from "../../lib/api";
import { ParticipantsModal } from "../../shared/ui/ParticipantsModal";

/** Engagement detail Participants tab — roster layout (see ParticipantsModal page variant). */
export function EngagementParticipantsRoster({
  engagementId,
  engagementName,
}: {
  engagementId: number;
  engagementName?: string;
}) {
  return (
    <ParticipantsModal
      variant="page"
      open
      onClose={() => {}}
      source={{
        kind: "engagement-id",
        engagementId,
        name: engagementName,
      }}
    />
  );
}

export type EngagementRosterSummary = EngagementDataCompletenessResponse["summary"];
