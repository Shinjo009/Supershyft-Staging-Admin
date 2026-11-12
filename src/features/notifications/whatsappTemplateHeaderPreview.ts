import type { WhatsappTemplateMeta } from "../../lib/api";

export function resolvePreviewHeaderUrl(
  meta: WhatsappTemplateMeta | null | undefined,
  userHeaderUrl?: string | null
): string | null {
  const user = (userHeaderUrl ?? "").trim();
  if (user) return user;
  const sample = (meta?.header_example_url ?? "").trim();
  return sample || null;
}

export type ParsedTemplateHeader = {
  link: string | null;
  filename: string | null;
};

export function parseHeaderFromTemplateVariablesJson(raw: string): ParsedTemplateHeader {
  const text = raw.trim();
  if (!text) return { link: null, filename: null };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const header = parsed.header;
    if (!header || typeof header !== "object") {
      return { link: null, filename: null };
    }
    const h = header as Record<string, unknown>;
    const link = typeof h.link === "string" ? h.link.trim() : null;
    const filename = typeof h.filename === "string" ? h.filename.trim() : null;
    return { link: link || null, filename: filename || null };
  } catch {
    return { link: null, filename: null };
  }
}
