import type { Participant, ParticipantBloodBooking } from "./api";

function collectedAtSortKey(b: ParticipantBloodBooking): number | null {
  if (!b.collected_at) return null;
  const t = Date.parse(b.collected_at);
  return Number.isNaN(t) ? null : t;
}

/** Mirrors API `get_current_collection`: active, not resample; newest by collected_at then id. */
export function pickCurrentBloodBooking(
  bookings: ParticipantBloodBooking[]
): ParticipantBloodBooking | undefined {
  const candidates = (bookings ?? []).filter(
    (b) => b.status === "active" && b.relation !== "resample"
  );
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const ta = collectedAtSortKey(a);
    const tb = collectedAtSortKey(b);
    if (ta === null && tb === null) {
      return (b.id ?? 0) - (a.id ?? 0);
    }
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (tb !== ta) return tb - ta;
    return (b.id ?? 0) - (a.id ?? 0);
  });
  return candidates[0];
}

export function applyParticipantBookingId(
  participant: Participant,
  bookingId: string | null
): Participant {
  const bookings = participant.blood_bookings ?? [];
  const current = pickCurrentBloodBooking(bookings);
  const nextBookings =
    current?.id != null
      ? bookings.map((b) => (b.id === current.id ? { ...b, booking_id: bookingId } : b))
      : bookings;
  return { ...participant, booking_id: bookingId, blood_bookings: nextBookings };
}

const RELATION_HELP: Record<string, string> = {
  primary: "First scheduled blood draw for this participant.",
  redraw: "A new blood draw was needed (separate test & report). The earlier draw stays on record.",
  resample: "Lab asked for another sample for the same report (linked to the original booking).",
  reschedule: "Appointment was moved; the old slot is kept for history.",
};

export function relationHelpText(relation: string | undefined): string {
  return RELATION_HELP[relation ?? "primary"] ?? RELATION_HELP.primary;
}

export function relationPlainLabel(relation: string | undefined): string {
  switch (relation) {
    case "redraw":
      return "Redraw (new test)";
    case "resample":
      return "Resample (same report)";
    case "reschedule":
      return "Rescheduled";
    default:
      return "Primary draw";
  }
}

export function formatCollectionWhen(b: ParticipantBloodBooking): string {
  const parts: string[] = [];
  if (b.collection_date) parts.push(b.collection_date);
  if (b.collection_time) parts.push(b.collection_time.slice(0, 5));
  if (b.collected_at) {
    try {
      parts.push(new Date(b.collected_at).toLocaleString());
    } catch {
      parts.push(b.collected_at);
    }
  }
  return parts.join(" · ") || "—";
}

/** Short label for the participants table (non-technical). */
export function summarizeBloodCollections(bookings: ParticipantBloodBooking[]): {
  count: number;
  shortLabel: string;
  hint: string;
} {
  const rows = bookings ?? [];
  const count = rows.length;
  if (count === 0) {
    return { count: 0, shortLabel: "None yet", hint: "No blood collection history." };
  }

  const activeRedraws = rows.filter((b) => b.relation === "redraw" && b.status !== "cancelled").length;
  const resamples = rows.filter((b) => b.relation === "resample").length;
  const reschedules = rows.filter((b) => b.relation === "reschedule").length;

  const tags: string[] = [];
  if (activeRedraws > 0) tags.push(`${activeRedraws} redraw`);
  if (resamples > 0) tags.push(`${resamples} resample`);
  if (reschedules > 0) tags.push(`${reschedules} reschedule`);

  const shortLabel =
    count === 1
      ? tags.length ? `1 draw · ${tags[0]}` : "1 draw"
      : tags.length
        ? `${count} draws · ${tags.join(", ")}`
        : `${count} draws`;

  const hint =
    tags.length > 0
      ? `This participant has ${count} collection record(s) including ${tags.join(", ")}. Open for the full story.`
      : `${count} collection record(s). Open to see booking IDs and dates.`;

  return { count, shortLabel, hint };
}

/** One-line story for drawer header. */
export function collectionsStoryLine(bookings: ParticipantBloodBooking[]): string {
  const { count } = summarizeBloodCollections(bookings);
  if (count === 0) return "No collections recorded yet.";
  const redraw = bookings.filter((b) => b.relation === "redraw").length;
  if (redraw > 0) {
    return `${count} collection(s) on file — including ${redraw} redraw(s) (new lab test). Each draw has its own booking ID.`;
  }
  return `${count} collection(s) on file. Newest events are listed first below.`;
}
