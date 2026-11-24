import type { IntegrationSyncLog } from "../../lib/api";

const ORANGE_RESCHEDULE_BODY_KEYS = [
  "requested_slot_time",
  "reschedule_reason",
  "reschedule_explanation",
] as const;

export type IntegrationLogDetailView = {
  method: string;
  apiName: string;
  path: unknown;
  query: unknown;
  partnerBody: unknown;
  internal: unknown;
  sent: unknown;
  received: unknown;
  error: string | null;
};

function apiNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const tail = path.split("/").filter(Boolean).pop() ?? path;
    return tail;
  } catch {
    return url;
  }
}

function inferHttpMethodForUrl(url: string, provider: string): string | null {
  if (provider === "orange_health" || provider === "healthians") {
    try {
      const path = new URL(url).pathname.toLowerCase();
      if (path.endsWith("/reschedule") || path.endsWith("/cancel")) return "PATCH";
      if (path.endsWith("/order")) return "POST";
      if (path.includes("serviceability")) return "GET";
    } catch {
      /* ignore */
    }
  }
  return null;
}

function fullApiUrl(log: IntegrationSyncLog): string {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.trim()) return record.url.trim();
  }
  return (log.api_endpoint_url || "").trim();
}

function pickPath(log: IntegrationSyncLog): unknown {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (record.path !== undefined) return record.path;
    const url = typeof record.url === "string" ? record.url : log.api_endpoint_url;
    const match = url.match(/\/partner\/([^/]+)\/reschedule/i);
    if (match?.[1]) return { request_id: match[1] };
  }
  return null;
}

function pickQuery(log: IntegrationSyncLog): unknown {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const query = (req as Record<string, unknown>).query;
    if (query !== undefined) return query;
  }
  return null;
}

function pickPartnerBody(log: IntegrationSyncLog): unknown {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (record.body !== undefined && typeof record.body === "object" && record.body !== null) {
      return record.body;
    }
    const legacy: Record<string, unknown> = {};
    for (const key of ORANGE_RESCHEDULE_BODY_KEYS) {
      if (record[key] !== undefined) legacy[key] = record[key];
    }
    if (Object.keys(legacy).length > 0) return legacy;
  }
  return null;
}

function pickInternal(log: IntegrationSyncLog): unknown {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (record.internal !== undefined) return record.internal;
    if (record.audit !== undefined) return record.audit;
  }
  return null;
}

function pickSent(log: IntegrationSyncLog): unknown {
  const partner = pickPartnerBody(log);
  if (partner != null) return partner;
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (record.query !== undefined) {
      if (typeof record.url === "string") {
        return { url: record.url, query: record.query };
      }
      return record.query;
    }
  }
  return req ?? null;
}

function pickReceived(log: IntegrationSyncLog): unknown {
  const res = log.response_payload;
  if (!res || typeof res !== "object" || Array.isArray(res)) return res ?? null;
  const record = res as Record<string, unknown>;
  if (record.response_body !== undefined) return record.response_body;
  if (record.handler_result !== undefined) {
    return record;
  }
  if (record.data !== undefined) {
    return res;
  }
  if (record.queue_id !== undefined || record.message_status !== undefined) {
    return {
      ...(record.queue_id ? { queue_id: record.queue_id } : {}),
      ...(record.message_status ? { message_status: record.message_status } : {}),
      ...(record.accepted !== undefined ? { accepted: record.accepted } : {}),
    };
  }
  return res;
}

function pickMethod(log: IntegrationSyncLog): string {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const method = (req as Record<string, unknown>).http_method;
    if (typeof method === "string" && method.trim()) return method.trim().toUpperCase();
  }
  const res = log.response_payload;
  if (res && typeof res === "object" && !Array.isArray(res)) {
    const method = (res as Record<string, unknown>).http_method;
    if (typeof method === "string" && method.trim()) return method.trim().toUpperCase();
  }
  const inferred = inferHttpMethodForUrl(log.api_endpoint_url, log.provider);
  if (inferred) return inferred;
  if (log.api_endpoint_url.includes("message_templates")) return "GET";
  if (log.api_endpoint_url.endsWith("/messages")) return "POST";
  return "—";
}

function pickApiName(log: IntegrationSyncLog): string {
  const full = fullApiUrl(log);
  if (full) return full;
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const name = (req as Record<string, unknown>).api_name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return apiNameFromUrl(log.api_endpoint_url);
}

export function buildIntegrationLogDetailView(log: IntegrationSyncLog): IntegrationLogDetailView {
  const partnerBody = pickPartnerBody(log);
  return {
    method: pickMethod(log),
    apiName: pickApiName(log),
    path: pickPath(log),
    query: pickQuery(log),
    partnerBody,
    internal: pickInternal(log),
    sent: partnerBody ?? pickSent(log),
    received: pickReceived(log),
    error: log.error_message ?? null,
  };
}

export function formatJsonBlock(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
