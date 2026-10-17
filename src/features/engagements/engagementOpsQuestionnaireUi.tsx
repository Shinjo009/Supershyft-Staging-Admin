import { CheckCheck, CircleDot, Clock, Minus } from "lucide-react";
import type { EngagementQuestionnaireCategoryStatus } from "../../lib/api";

export const METSIGHTS_CATEGORY_COLUMNS = [
  { key: "physical-measurement", label: "Anthropometry" },
  { key: "diet-lifestyle-parameters", label: "Diet & Lifestyle" },
  { key: "vitals", label: "Vitals" },
  { key: "fitness-parameters", label: "Fitness Params" },
] as const;

export function OpsCategoryIcon({ cat }: { cat?: EngagementQuestionnaireCategoryStatus }) {
  if (!cat || !cat.assigned) {
    return (
      <span title="Not assigned">
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
      </span>
    );
  }
  if (cat.status !== "complete" && !cat.has_responses) {
    return (
      <span title="Not started">
        <Minus className="w-3.5 h-3.5 text-zinc-400" />
      </span>
    );
  }
  if (cat.status !== "complete" && cat.has_responses) {
    const unanswered = cat.unanswered_required ?? [];
    const tip =
      unanswered.length > 0
        ? `Unanswered required (${unanswered.length}):\n` +
          unanswered
            .slice(0, 20)
            .map((q) => `• ${q.question_text || `Question #${q.question_id}`}`)
            .join("\n") +
          (unanswered.length > 20 ? `\n…and ${unanswered.length - 20} more` : "")
        : "Partially filled";
    return (
      <span className="relative group/partial inline-flex">
        <CircleDot className="w-3.5 h-3.5 text-amber-500" />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-1.5 w-64 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/partial:opacity-100 whitespace-pre-line"
        >
          {tip}
        </span>
      </span>
    );
  }
  if (cat.status === "complete" && cat.is_submitted) {
    return (
      <span title="Submitted to MetSights">
        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
      </span>
    );
  }
  return (
    <span title="Filled">
      <CheckCheck className="w-3.5 h-3.5 text-zinc-900" />
    </span>
  );
}

export function OpsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 mt-2">
      <span className="inline-flex items-center gap-0.5"><CheckCheck className="w-3 h-3 text-zinc-900" /> Filled</span>
      <span className="inline-flex items-center gap-0.5"><CheckCheck className="w-3 h-3 text-emerald-600" /> Submitted</span>
      <span className="inline-flex items-center gap-0.5"><CircleDot className="w-3 h-3 text-amber-500" /> Partial</span>
      <span className="inline-flex items-center gap-0.5"><Minus className="w-3 h-3 text-zinc-400" /> Not started</span>
      <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3 text-zinc-400" /> Not assigned</span>
    </div>
  );
}
