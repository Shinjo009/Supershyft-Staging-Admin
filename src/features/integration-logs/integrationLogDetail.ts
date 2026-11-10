import type { IntegrationSyncLog } from "../../lib/api";

export type IntegrationLogDetailView = {
  method: string;
  apiName: string;
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

function pickSent(log: IntegrationSyncLog): unknown {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const record = req as Record<string, unknown>;
    if (record.body !== undefined) return record.body;
    if (record.query !== undefined) return record.query;
  }
  return req ?? null;
}

function pickReceived(log: IntegrationSyncLog): unknown {
  const res = log.response_payload;
  if (!res || typeof res !== "object" || Array.isArray(res)) return res ?? null;
  const record = res as Record<string, unknown>;
  if (record.response_body !== undefined) return record.response_body;
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
  if (log.api_endpoint_url.includes("message_templates")) return "GET";
  if (log.api_endpoint_url.endsWith("/messages")) return "POST";
  return "—";
}

function pickApiName(log: IntegrationSyncLog): string {
  const req = log.request_payload;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    const name = (req as Record<string, unknown>).api_name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return apiNameFromUrl(log.api_endpoint_url);
}

export function buildIntegrationLogDetailView(log: IntegrationSyncLog): IntegrationLogDetailView {
  return {
    method: pickMethod(log),
    apiName: pickApiName(log),
    sent: pickSent(log),
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
