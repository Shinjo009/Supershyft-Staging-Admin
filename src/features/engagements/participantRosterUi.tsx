import { ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import type { Participant } from "../../lib/api";
import {
  CompletenessFlagIcon,
  CompletenessQuestionnaireIcon,
} from "./engagementCompletenessUi";
import { METSIGHTS_CATEGORY_COLUMNS, OpsCategoryIcon } from "./engagementOpsQuestionnaireUi";

export function RosterProgressChips({ participant }: { participant: Participant }) {
  const qState = participant.questionnaire_state ?? "not_started";
  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <CompletenessFlagIcon present={Boolean(participant.has_booking_id ?? participant.booking_id)} label="Booking" />
      <CompletenessFlagIcon present={Boolean(participant.has_blood_report)} label="Blood report" />
      <CompletenessFlagIcon present={Boolean(participant.has_bio_ai_report)} label="Bio AI report" />
      <CompletenessQuestionnaireIcon state={qState} />
    </div>
  );
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

export function ParticipantRosterExpandRow({
  participant,
  colSpan,
}: {
  participant: Participant;
  colSpan: number;
}) {
  const categories = participant.questionnaire_categories ?? {};
  return (
    <tr className="bg-zinc-50/80 border-b border-zinc-100">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-2">Questionnaire categories</div>
            <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-2 py-1.5 text-left text-zinc-500">Category</th>
                    {METSIGHTS_CATEGORY_COLUMNS.map((col) => (
                      <th key={col.key} className="px-1 py-1.5 text-center text-zinc-500 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1.5 text-zinc-600">Status</td>
                    {METSIGHTS_CATEGORY_COLUMNS.map((col) => (
                      <td key={col.key} className="px-1 py-1.5 text-center">
                        <OpsCategoryIcon cat={categories[col.key]} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Reports</div>
              <ul className="space-y-1 text-zinc-700">
                <ReportLinkRow label="Blood report" url={participant.blood_report_url} />
                <ReportLinkRow label="Bio AI report" url={participant.bio_ai_report_url} />
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Metsights sync</div>
              <dl className="grid grid-cols-1 gap-1 text-xs text-zinc-700">
                <SyncRow label="Profile" value={participant.is_profile_created_on_metsights} />
                <SyncRow label="Primary record" value={participant.is_primary_record_id_synced} />
                <SyncRow label="FitPrint record" value={participant.is_fitprint_record_id_synced} />
              </dl>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function SyncRow({ label, value }: { label: string; value?: boolean | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className={value ? "text-emerald-700" : "text-zinc-400"}>{value ? "Yes" : "No"}</span>
    </div>
  );
}

function ReportLinkRow({ label, url }: { label: string; url?: string | null }) {
  if (!url?.trim()) {
    return (
      <li className="flex justify-between gap-2 text-zinc-400">
        <span>{label}</span>
        <span>—</span>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-zinc-600">{label}</span>
      <span className="inline-flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-700 hover:underline inline-flex items-center gap-0.5"
        >
          Open
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
          title="Copy URL"
          onClick={() => copyText(url)}
        >
          <Copy className="w-3 h-3" />
        </button>
      </span>
    </li>
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
