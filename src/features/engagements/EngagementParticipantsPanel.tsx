import { EngagementParticipantsRoster } from "./EngagementParticipantsRoster";

export function EngagementParticipantsPanel({
  engagementId,
  engagementName,
}: {
  engagementId: number;
  engagementName?: string;
}) {
  return (
    <EngagementParticipantsRoster engagementId={engagementId} engagementName={engagementName} />
  );
}
