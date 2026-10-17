import { ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import type {
  EngagementQuestionnaireCategoryStatus,
  Participant,
  ParticipantQuestionnaireCategories,
  RosterQuestionnaireColumn,
} from "../../lib/api";
import { CompletenessFlagIcon } from "./engagementCompletenessUi";
import { OpsCategoryIcon } from "./engagementOpsQuestionnaireUi";

export function participantCategoryMaps(
  participant: Participant
): ParticipantQuestionnaireCategories {
  const raw = participant.questionnaire_categories;
  if (!raw) {
    return { metsights: {}, supershyft: {} };
  }
  if ("metsights" in raw || "supershyft" in raw) {
    return raw as ParticipantQuestionnaireCategories;
  }
  return { metsights: raw as Record<string, EngagementQuestionnaireCategoryStatus>, supershyft: {} };
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

/** Archived blood URL from roster fields, else diagnostic URL on a collection booking. */
export function resolveParticipantBloodReportUrl(participant: Participant): string | null {
  const direct = participant.blood_report_url?.trim();
  if (direct) return direct;
  for (const bb of participant.blood_bookings ?? []) {
    const fromBooking = bb.diagnostic_report_url?.trim();
    if (fromBooking) return fromBooking;
  }
  return null;
}

export function ReportUrlCell({ url, label }: { url?: string | null; label: string }) {
  if (!url?.trim()) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-700 hover:underline text-xs"
        title={label}
      >
        Open
        <ExternalLink className="w-3 h-3 inline" />
      </a>
      <button
        type="button"
        className="p-0.5 rounded hover:bg-zinc-100 text-zinc-500"
        title="Copy URL"
        onClick={() => copyText(url)}
      >
        <Copy className="w-3 h-3" />
      </button>
    </span>
  );
}

export function QuestionnaireCategoryCell({
  participant,
  column,
}: {
  participant: Participant;
  column: RosterQuestionnaireColumn;
}) {
  const maps = participantCategoryMaps(participant);
  const bucket = column.category_of === "metsights" ? maps.metsights : maps.supershyft;
  const cat = bucket?.[column.key];
  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <OpsCategoryIcon cat={cat} />
    </div>
  );
}

export function ParticipantRosterExpandRow({
  participant,
  colSpan,
}: {
  participant: Participant;
  colSpan: number;
}) {
  return (
    <tr className="bg-zinc-50/80 border-b border-zinc-100">
      <td colSpan={colSpan} className="px-4 py-2 text-xs text-zinc-500">
        Use <span className="font-medium text-zinc-700">Clinical details</span> on the participant row for
        blood, Bio AI, and questionnaire breakdown. Metsights sync: profile{" "}
        {participant.is_profile_created_on_metsights ? "yes" : "no"}, primary{" "}
        {participant.is_primary_record_id_synced ? "yes" : "no"}, FitPrint{" "}
        {participant.is_fitprint_record_id_synced ? "yes" : "no"}.
      </td>
    </tr>
  );
}

export function RosterExpandToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse details" : "Expand details"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

export function RosterBloodCells({ participant }: { participant: Participant }) {
  return (
    <>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon present={Boolean(participant.has_blood_report)} label="Blood report" />
      </td>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon present={Boolean(participant.has_blood_values)} label="Blood values" />
      </td>
    </>
  );
}

function participantHasBioAiValues(participant: Participant): boolean {
  return Boolean(participant.has_bio_ai_values ?? participant.has_bio_ai_json);
}

export function RosterBioAiCells({ participant }: { participant: Participant }) {
  return (
    <>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon present={Boolean(participant.has_bio_ai_report)} label="Bio AI report" />
      </td>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon present={participantHasBioAiValues(participant)} label="Bio AI values" />
      </td>
    </>
  );
}

export function RosterFitprintCells({ participant }: { participant: Participant }) {
  return (
    <>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon
          present={Boolean(participant.has_fitprint_report)}
          label="Fitprint report"
        />
      </td>
      <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
        <CompletenessFlagIcon
          present={Boolean(participant.has_fitprint_values)}
          label="Fitprint values"
        />
      </td>
    </>
  );
}
