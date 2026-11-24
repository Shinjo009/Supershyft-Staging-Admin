import { describe, expect, it } from "vitest";

import type { IntegrationSyncLog } from "../../lib/api";
import { buildIntegrationLogDetailView } from "./integrationLogDetail";

function baseLog(overrides: Partial<IntegrationSyncLog> = {}): IntegrationSyncLog {
  return {
    sync_log_id: 1,
    provider: "orange_health",
    api_endpoint_url: "https://partner-api.orangehealth.in/v1/partner/MUM1/reschedule",
    request_payload: null,
    response_payload: null,
    status: "success",
    error_message: null,
    created_at: "2026-01-01T00:00:00Z",
    engagement_id: null,
    user_id: null,
    ...overrides,
  };
}

describe("buildIntegrationLogDetailView", () => {
  it("splits partner body from internal metadata in envelope logs", () => {
    const log = baseLog({
      request_payload: {
        http_method: "PATCH",
        url: "https://partner-api.orangehealth.in/v1/partner/MUM1/reschedule",
        path: { request_id: "MUM1" },
        query: { token: "[redacted]" },
        body: {
          requested_slot_time: "2026-11-27T09:00:00",
          reschedule_reason: "r",
          reschedule_explanation: "e",
        },
        internal: { operation: "reschedule", revalidation: { status: "matched" } },
      },
    });

    const view = buildIntegrationLogDetailView(log);
    expect(view.method).toBe("PATCH");
    expect(view.path).toEqual({ request_id: "MUM1" });
    expect(view.partnerBody).toEqual({
      requested_slot_time: "2026-11-27T09:00:00",
      reschedule_reason: "r",
      reschedule_explanation: "e",
    });
    expect(view.internal).toEqual({
      operation: "reschedule",
      revalidation: { status: "matched" },
    });
  });

  it("maps legacy flat audit rows to internal only", () => {
    const log = baseLog({
      request_payload: {
        audit: { operation: "reschedule" },
        requested_slot_time: "2026-11-27T09:00:00",
        reschedule_reason: "r",
        reschedule_explanation: "e",
      },
    });
    const view = buildIntegrationLogDetailView(log);
    expect(view.partnerBody).toEqual({
      requested_slot_time: "2026-11-27T09:00:00",
      reschedule_reason: "r",
      reschedule_explanation: "e",
    });
    expect(view.internal).toEqual({ operation: "reschedule" });
  });
});