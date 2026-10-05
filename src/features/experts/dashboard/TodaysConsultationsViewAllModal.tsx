import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Modal } from "../../../shared/ui/Modal";
import type { ExpertDashboardTodayConsultation } from "../../../lib/api";
import {
  consultationStatusClass,
  consultationStatusLabel,
  engagementLabel,
  formatExpertType,
  formatSlot12h,
  personName,
} from "./dashboardUtils";

export function TodaysConsultationsViewAllModal({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: ExpertDashboardTodayConsultation[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Today's Consultations"
      maxWidthClassName="max-w-2xl"
    >
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">No consultations scheduled for today.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => {
            const name = personName(item.first_name, item.last_name, item.user_id);
            const manageHref = `/experts/consultation/${item.consultation_id}/manage`;
            const canJoin = Boolean(item.meet_link);
            return (
              <li key={item.consultation_id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <p className="w-20 shrink-0 text-sm font-semibold text-zinc-900 tabular-nums">
                      {formatSlot12h(item.slot)}
                    </p>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{name}</p>
                      <p className="mt-0.5 text-sm text-zinc-500 truncate">
                        {formatExpertType(item.expert_type)} Consultation
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 truncate">
                        {engagementLabel(item.engagement_name, item.engagement_code, item.engagement_id)}
                        <span className="text-zinc-300"> · </span>
                        {item.mode === "offline" ? "Offline" : "Online"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0 pl-24 sm:pl-0">
                    <span
                      className={`inline-flex text-[11px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${consultationStatusClass(item.status)}`}
                    >
                      {consultationStatusLabel(item.status)}
                    </span>
                    {canJoin ? (
                      <a
                        href={item.meet_link ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        Join
                      </a>
                    ) : null}
                    <Link
                      to={manageHref}
                      onClick={onClose}
                      className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
