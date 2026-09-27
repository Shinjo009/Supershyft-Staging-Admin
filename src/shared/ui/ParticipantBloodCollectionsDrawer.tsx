import { X } from "lucide-react";
import type { ParticipantBloodBooking } from "../../lib/api";

function relationLabel(relation: string): string {
  switch (relation) {
    case "resample":
      return "Resample (same report)";
    case "redraw":
      return "Redraw (new test)";
    case "reschedule":
      return "Reschedule";
    default:
      return "Primary";
  }
}

export function ParticipantBloodCollectionsDrawer({
  open,
  onClose,
  participantName,
  bookings,
}: {
  open: boolean;
  onClose: () => void;
  participantName: string;
  bookings: ParticipantBloodBooking[];
}) {
  if (!open) return null;

  const sorted = [...bookings].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close collections panel"
        onClick={onClose}
      />
      <aside
        className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto flex flex-col"
        role="dialog"
        aria-labelledby="collections-drawer-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div>
            <h2 id="collections-drawer-title" className="text-lg font-semibold text-zinc-900">
              Blood collections
            </h2>
            <p className="text-sm text-zinc-500">{participantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1">
          {sorted.length === 0 ? (
            <p className="text-sm text-zinc-500">No collection records yet.</p>
          ) : (
            sorted.map((b) => (
              <div
                key={b.id ?? `${b.booking_id}-${b.barcode}`}
                className={`rounded-xl border p-3 ${
                  b.status === "superseded"
                    ? "border-zinc-200 bg-zinc-50 opacity-75"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                    {relationLabel(b.relation ?? "primary")}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 capitalize">
                    {b.status ?? "active"}
                  </span>
                  {b.has_blood_parameters && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                      Lab data
                    </span>
                  )}
                </div>
                <dl className="text-sm space-y-1 text-zinc-700">
                  <div>
                    <dt className="text-zinc-500 inline">Booking ID: </dt>
                    <dd className="inline font-mono">{b.booking_id || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 inline">Barcode: </dt>
                    <dd className="inline font-mono">{b.barcode || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 inline">Date / time: </dt>
                    <dd className="inline">
                      {[b.collection_date, b.collection_time].filter(Boolean).join(" · ") || "—"}
                    </dd>
                  </div>
                  {b.collection_cabin && (
                    <div>
                      <dt className="text-zinc-500 inline">Cabin: </dt>
                      <dd className="inline">{b.collection_cabin}</dd>
                    </div>
                  )}
                  {b.parent_booking_id && (
                    <div>
                      <dt className="text-zinc-500 inline">Parent booking: </dt>
                      <dd className="inline font-mono">{b.parent_booking_id}</dd>
                    </div>
                  )}
                  {b.diagnostic_report_url && (
                    <div className="pt-1">
                      <a
                        href={b.diagnostic_report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-700 hover:underline"
                      >
                        Open report PDF
                      </a>
                    </div>
                  )}
                </dl>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
