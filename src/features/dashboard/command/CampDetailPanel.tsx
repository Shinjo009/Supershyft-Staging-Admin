import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, Section, StatusBadge } from "./bits";
import { fmtDay } from "./dates";
import type { CommandDashboardState } from "./useCommandDashboard";

export function CampDetailPanel({ ops }: { ops: CommandDashboardState }) {
  const camp = ops.selectedCamp;

  if (!camp) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/40"
          onClick={() => ops.openCamp(null)}
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        <EmptyState title="Camp not found" hint="It may not be in the current bootstrap page. Open All camps drill." />
      </div>
    );
  }

  const meta = [
    { label: "Organization", value: camp.organization_name || "—" },
    { label: "City", value: camp.city || "—" },
    { label: "Dates", value: `${fmtDay(camp.start_date)} – ${fmtDay(camp.end_date)}` },
    { label: "Code", value: camp.engagement_code },
    { label: "Camp no", value: camp.camp_no != null ? String(camp.camp_no) : "—" },
    { label: "Payment", value: camp.payment_type || "—" },
    { label: "Blood collection", value: camp.blood_collection_type || "—" },
    { label: "Consultation mode", value: camp.consultation_mode || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/40"
            onClick={() => ops.openCamp(null)}
          >
            <ArrowLeft className="size-4" /> Back to camps
          </button>
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {camp.engagement_name || camp.engagement_code}
            <StatusBadge status={camp.status === "running" ? "ongoing" : camp.status} />
          </h1>
          <p className="text-sm text-muted-foreground">{camp.organization_name}</p>
        </div>
        <Link
          to={`/engagements/${camp.engagement_id}/console`}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-[0_1px_2px_oklch(0_0_0/0.04)] hover:border-foreground/20"
        >
          Open Console <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <Section title="Camp details">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="text-sm font-medium">{m.value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Operations"
        description="Full participant ops, slots, and reports live in Engagement Console."
      >
        <div className="flex flex-wrap gap-2 p-4">
          <Link
            to={`/engagements/${camp.engagement_id}/console`}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Manage participants
          </Link>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() =>
              ops.openDrill({
                drill: "b2b_camps",
                title: "B2B camps",
                audience: "b2b",
              })
            }
          >
            All camps list
          </button>
        </div>
      </Section>
    </div>
  );
}
