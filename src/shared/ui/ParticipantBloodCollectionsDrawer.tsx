import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ParticipantBloodBooking } from "../../lib/api";
import { getApiError, participantsApi } from "../../lib/api";
import {
  collectionsStoryLine,
  formatCollectionWhen,
  relationHelpText,
  relationPlainLabel,
} from "../../lib/bloodCollectionsSummary";

type FormState = {
  relation: ParticipantBloodBooking["relation"];
  status: ParticipantBloodBooking["status"];
  booking_id: string;
  barcode: string;
  collection_date: string;
  collection_time: string;
  collection_cabin: string;
  parent_booking_id: string;
};

function emptyForm(): FormState {
  return {
    relation: "primary",
    status: "active",
    booking_id: "",
    barcode: "",
    collection_date: "",
    collection_time: "",
    collection_cabin: "",
    parent_booking_id: "",
  };
}

function bookingToForm(b: ParticipantBloodBooking): FormState {
  return {
    relation: b.relation ?? "primary",
    status: b.status ?? "active",
    booking_id: b.booking_id ?? "",
    barcode: b.barcode ?? "",
    collection_date: b.collection_date ?? "",
    collection_time: b.collection_time?.slice(0, 5) ?? "",
    collection_cabin: b.collection_cabin ?? "",
    parent_booking_id: b.parent_booking_id ?? "",
  };
}

function payloadFromForm(form: FormState) {
  return {
    relation: form.relation,
    status: form.status,
    booking_id: form.booking_id.trim() || null,
    barcode: form.barcode.trim() || null,
    collection_date: form.collection_date || null,
    collection_time: form.collection_time ? `${form.collection_time}:00` : null,
    collection_cabin: form.collection_cabin.trim() || null,
    parent_booking_id: form.parent_booking_id.trim() || null,
  };
}

export function ParticipantBloodCollectionsDrawer({
  open,
  onClose,
  participantName,
  engagementId,
  userId,
  bookings,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  participantName: string;
  engagementId: number;
  userId: number;
  bookings: ParticipantBloodBooking[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [bookings]
  );

  if (!open) return null;

  const startEdit = (b: ParticipantBloodBooking) => {
    setEditingId(b.id ?? null);
    setForm(bookingToForm(b));
    setError(null);
  };

  const startAdd = () => {
    setEditingId("new");
    setForm(emptyForm());
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = payloadFromForm(form);
      if (editingId === "new") {
        await participantsApi.createBloodBooking(engagementId, userId, payload);
      } else if (typeof editingId === "number") {
        await participantsApi.updateBloodBooking(engagementId, userId, editingId, payload);
      }
      cancelEdit();
      onChanged();
    } catch (e: unknown) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: ParticipantBloodBooking) => {
    if (b.id == null) return;
    const hasLab = b.has_blood_parameters || b.diagnostic_report_url;
    const msg = hasLab
      ? "This collection has lab data. It will be marked cancelled (not fully removed). Continue?"
      : "Remove this collection record?";
    if (!window.confirm(msg)) return;
    setSaving(true);
    setError(null);
    try {
      await participantsApi.deleteBloodBooking(engagementId, userId, b.id);
      onChanged();
    } catch (e: unknown) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const formPanel = editingId !== null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close collections panel"
        onClick={onClose}
      />
      <aside
        className="relative w-full max-w-lg bg-white shadow-xl h-full overflow-y-auto flex flex-col"
        role="dialog"
        aria-labelledby="collections-drawer-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div>
            <h2 id="collections-drawer-title" className="text-lg font-semibold text-zinc-900">
              Blood collection history
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

        <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 text-sm text-sky-950 leading-relaxed">
          {collectionsStoryLine(bookings)}
        </div>

        <div className="px-4 py-2 flex gap-2 border-b border-zinc-100">
          <button
            type="button"
            onClick={startAdd}
            disabled={saving || formPanel}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add collection
          </button>
        </div>

        {error && (
          <p className="mx-4 mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {formPanel && (
          <div className="mx-4 mt-3 rounded-xl border border-zinc-200 p-3 space-y-2 bg-zinc-50">
            <p className="text-sm font-medium text-zinc-900">
              {editingId === "new" ? "New collection" : "Edit collection"}
            </p>
            <label className="block text-xs text-zinc-600">
              Type
              <select
                className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                value={form.relation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    relation: e.target.value as FormState["relation"],
                  }))
                }
              >
                <option value="primary">Primary draw</option>
                <option value="redraw">Redraw (new test)</option>
                <option value="resample">Resample (same report)</option>
                <option value="reschedule">Reschedule</option>
              </select>
            </label>
            <p className="text-xs text-zinc-500">{relationHelpText(form.relation)}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-zinc-600 col-span-2">
                Booking ID
                <input
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm font-mono"
                  value={form.booking_id}
                  onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Date
                <input
                  type="date"
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  value={form.collection_date}
                  onChange={(e) => setForm((f) => ({ ...f, collection_date: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Time
                <input
                  type="time"
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  value={form.collection_time}
                  onChange={(e) => setForm((f) => ({ ...f, collection_time: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600 col-span-2">
                Parent booking ID (resample / reschedule / redraw link)
                <input
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm font-mono"
                  value={form.parent_booking_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_booking_id: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Barcode
                <input
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm font-mono"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Status
                <select
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as FormState["status"],
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="superseded">Superseded (old slot)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-50 inline-flex items-center gap-1"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3 flex-1">
          {sorted.length === 0 ? (
            <p className="text-sm text-zinc-500">No collection records yet.</p>
          ) : (
            sorted.map((b) => (
              <div
                key={b.id ?? `${b.booking_id}-${b.barcode}`}
                className={`rounded-xl border p-3 ${
                  b.status === "superseded"
                    ? "border-amber-200 bg-amber-50/50"
                    : b.status === "cancelled"
                      ? "border-zinc-200 bg-zinc-50 opacity-80"
                      : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex justify-between gap-2 mb-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                      {relationPlainLabel(b.relation)}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 capitalize">
                      {b.status ?? "active"}
                    </span>
                    {b.has_blood_parameters && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                        Lab results
                      </span>
                    )}
                  </div>
                  {b.id != null && editingId === null && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => startEdit(b)}
                        className="p-1.5 rounded hover:bg-zinc-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => void remove(b)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-2">{relationHelpText(b.relation)}</p>
                <dl className="text-sm space-y-1 text-zinc-700">
                  <div>
                    <dt className="text-zinc-500 inline">Booking ID: </dt>
                    <dd className="inline font-mono font-medium">{b.booking_id || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 inline">When: </dt>
                    <dd className="inline">{formatCollectionWhen(b)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 inline">Barcode: </dt>
                    <dd className="inline font-mono">{b.barcode || "—"}</dd>
                  </div>
                  {b.parent_booking_id && (
                    <div>
                      <dt className="text-zinc-500 inline">Linked to earlier booking: </dt>
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
                        Open lab PDF
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
