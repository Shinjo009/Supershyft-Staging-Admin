import { Link } from "react-router-dom";
import { Tent } from "lucide-react";
import { Modal } from "../../../shared/ui/Modal";
import type { ExpertDashboardOpenCamp } from "../../../lib/api";
import { engagementLabel, formatCampDate, formatSlot12h } from "./dashboardUtils";

export function OpenCampsViewAllModal({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: ExpertDashboardOpenCamp[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="Open Camps" maxWidthClassName="max-w-2xl">
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Tent className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">No camps currently require your attention.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const name = engagementLabel(item.engagement_name, item.engagement_code, item.engagement_id);
            const campDate = formatCampDate(item.start_date);
            return (
              <li key={item.engagement_id}>
                <div className="rounded-lg border border-zinc-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{name}</p>
                      {campDate ? <p className="mt-0.5 text-xs text-zinc-500">{campDate}</p> : null}
                      <p className="mt-2 text-sm text-zinc-600">
                        {item.consultation_pending_count} consultation
                        {item.consultation_pending_count === 1 ? "" : "s"} open
                      </p>
                      {item.next_consultation_slot ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Next consultation: {formatSlot12h(item.next_consultation_slot)}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      to={`/experts/portal/camp-consultations/${item.engagement_id}`}
                      state={{
                        engagementName: name,
                        engagementCode: item.engagement_code,
                      }}
                      onClick={onClose}
                      className="shrink-0 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      View Camp
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
