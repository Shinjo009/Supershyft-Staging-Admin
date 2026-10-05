import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Loader2 } from "lucide-react";
import { Modal } from "../../../shared/ui/Modal";
import {
  expertsPortalApi,
  getApiError,
  type ConsultationRequestItem,
} from "../../../lib/api";
import { formatExpertType, formatSlot12h, personName } from "./dashboardUtils";

export function RequestsViewAllModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ConsultationRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await expertsPortalApi.listRequests();
        if (!cancelled) setItems(res.data.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Requests Waiting" maxWidthClassName="max-w-2xl">
      {error ? (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">No requests waiting.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => {
            const key = `${item.engagement_id}:${item.user_id}:${item.expert_type}`;
            const requested =
              item.date || item.slot
                ? [item.date, item.slot ? formatSlot12h(item.slot) : null].filter(Boolean).join(" · ")
                : "No slot yet";
            return (
              <li key={key} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">
                      {personName(item.first_name, item.last_name, item.user_id)}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500 truncate">
                      {formatExpertType(item.expert_type)} Consultation
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{requested}</p>
                    {item.engagement_code ? (
                      <p className="mt-0.5 text-xs text-zinc-400 truncate">{item.engagement_code}</p>
                    ) : null}
                  </div>
                  <Link
                    to="/experts/requests"
                    onClick={onClose}
                    className="shrink-0 inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
