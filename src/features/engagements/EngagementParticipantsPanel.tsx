import { ParticipantsModal } from "../../shared/ui/ParticipantsModal";

export function EngagementParticipantsPanel({
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
