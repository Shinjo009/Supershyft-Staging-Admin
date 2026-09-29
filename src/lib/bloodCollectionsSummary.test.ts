import { describe, expect, it } from "vitest";
import {
  applyParticipantBookingId,
  pickCurrentBloodBooking,
} from "./bloodCollectionsSummary";
import type { Participant, ParticipantBloodBooking } from "./api";

function booking(partial: ParticipantBloodBooking): ParticipantBloodBooking {
  return partial;
}

describe("pickCurrentBloodBooking", () => {
  it("excludes cancelled and resample rows", () => {
    const rows = [
      booking({ id: 1, status: "cancelled", relation: "primary", collected_at: "2025-01-10T00:00:00Z" }),
      booking({ id: 2, status: "active", relation: "resample", collected_at: "2025-01-11T00:00:00Z" }),
      booking({ id: 3, status: "active", relation: "primary", collected_at: "2025-01-09T00:00:00Z" }),
    ];
    expect(pickCurrentBloodBooking(rows)?.id).toBe(3);
  });

  it("picks newest active primary by collected_at then id", () => {
    const rows = [
      booking({ id: 10, status: "active", relation: "primary", collected_at: "2025-02-01T00:00:00Z" }),
      booking({ id: 11, status: "active", relation: "redraw", collected_at: "2025-03-01T00:00:00Z" }),
    ];
    expect(pickCurrentBloodBooking(rows)?.id).toBe(11);
  });

  it("breaks ties on id when collected_at matches", () => {
    const at = "2025-02-01T12:00:00Z";
    const rows = [
      booking({ id: 5, status: "active", relation: "primary", collected_at: at }),
      booking({ id: 8, status: "active", relation: "primary", collected_at: at }),
    ];
    expect(pickCurrentBloodBooking(rows)?.id).toBe(8);
  });
});

describe("applyParticipantBookingId", () => {
  it("updates participant booking_id and current collection row", () => {
    const participant: Participant = {
      user_id: 1,
      booking_id: "old",
      blood_bookings: [
        booking({ id: 1, status: "active", relation: "primary", booking_id: "old" }),
        booking({ id: 2, status: "cancelled", relation: "primary", booking_id: "gone" }),
      ],
    };
    const next = applyParticipantBookingId(participant, "new-id");
    expect(next.booking_id).toBe("new-id");
    expect(next.blood_bookings?.find((b) => b.id === 1)?.booking_id).toBe("new-id");
    expect(next.blood_bookings?.find((b) => b.id === 2)?.booking_id).toBe("gone");
  });
});
