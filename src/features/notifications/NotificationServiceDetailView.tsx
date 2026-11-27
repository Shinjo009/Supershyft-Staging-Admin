import { useMemo, type ReactNode } from "react";
import { Calendar, Eye, Mail, MessageCircle } from "lucide-react";
import type { NotificationServiceItem } from "../../lib/api";
import {
  ActiveBadge,
  channelLabel,
  formatDateTime,
  stringifyTemplateVariables,
} from "./notificationsUiShared";
import { WhatsappTemplateMessagePreview } from "./WhatsappTemplateMessagePreview";
import { WhatsappTemplateMetaStatus } from "./WhatsappTemplateMetaStatus";
import { useWhatsappTemplateLookup } from "./useWhatsappTemplateLookup";
import { renderPositionalTemplateBody } from "./whatsappTemplatePreviewUtils";
import { previewValuesFromTemplateVariablesJson } from "./whatsappTemplateSlotPreviewValues";
import {
  parseHeaderFromTemplateVariablesJson,
  resolvePreviewHeaderUrl,
} from "./whatsappTemplateHeaderPreview";

type SlotRow = { index: number; display: string };

function slotsFromTemplateVariables(tv: unknown): SlotRow[] {
  if (!tv || typeof tv !== "object" || Array.isArray(tv)) return [];
  const slots = (tv as { slots?: unknown }).slots;
  if (!Array.isArray(slots)) return [];
  const rows: SlotRow[] = [];
  for (const raw of slots) {
    if (!raw || typeof raw !== "object") continue;
    const slot = raw as { index?: number; source?: string; value?: string };
    const index = typeof slot.index === "number" ? slot.index : rows.length + 1;
    const source = String(slot.source ?? "").trim();
    const display =
      source === "literal"
        ? String(slot.value ?? "")
        : source
          ? `{{${source}}}`
          : String(slot.value ?? "");
    rows.push({ index, display });
  }
  return rows.sort((a, b) => a.index - b.index);
}

function MetaStripItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <div className="text-sm text-zinc-900 font-medium truncate">{children}</div>
    </div>
  );
}

export function NotificationServiceDetailView({ service }: { service: NotificationServiceItem }) {
  const isWhatsapp = service.channel === "whatsapp";
  const templateVariablesJson = useMemo(
    () => stringifyTemplateVariables(service.template_variables),
    [service.template_variables]
  );
  const slotRows = useMemo(
    () => slotsFromTemplateVariables(service.template_variables),
    [service.template_variables]
  );

  const waLookup = useWhatsappTemplateLookup(isWhatsapp ? service.template_name ?? "" : "", {
    auto: isWhatsapp,
  });

  const whatsappPreviewText = useMemo(() => {
    if (!isWhatsapp || !waLookup.meta?.found || !waLookup.meta.body_text) return "";
    const values = previewValuesFromTemplateVariablesJson(
      templateVariablesJson,
      waLookup.meta.body_example_values
    );
    return renderPositionalTemplateBody(waLookup.meta.body_text, values);
  }, [isWhatsapp, templateVariablesJson, waLookup.meta]);

  const parsedHeader = useMemo(
    () => parseHeaderFromTemplateVariablesJson(templateVariablesJson),
    [templateVariablesJson]
  );

  const whatsappPreviewHeaderUrl = useMemo(
    () => resolvePreviewHeaderUrl(waLookup.meta, parsedHeader.link),
    [waLookup.meta, parsedHeader.link]
  );

  const whatsappPreviewHeaderLabel = useMemo(() => {
    const fmt = (waLookup.meta?.header_format ?? "").toUpperCase();
    if (fmt === "DOCUMENT" && parsedHeader.filename) return parsedHeader.filename;
    return null;
  }, [waLookup.meta?.header_format, parsedHeader.filename]);

  const emailHasHtml = Boolean(service.email_html?.trim());
  const emailPlain = service.email_body?.trim() || "";
  const emailSubject = service.email_subject?.trim() || "(no subject)";
  const templatePill = isWhatsapp
    ? service.template_name?.trim() || "—"
    : service.email_subject?.trim() || "—";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 sm:px-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-0 lg:divide-x lg:divide-zinc-200">
          <div className="lg:pr-4">
            <MetaStripItem label="Display Name">{service.display_name || "—"}</MetaStripItem>
          </div>
          <div className="lg:px-4">
            <MetaStripItem label="Channel">
              <span className="inline-flex items-center gap-1.5">
                {isWhatsapp ? (
                  <MessageCircle className="w-4 h-4 text-emerald-600" aria-hidden />
                ) : (
                  <Mail className="w-4 h-4 text-blue-600" aria-hidden />
                )}
                {channelLabel(service.channel)}
              </span>
            </MetaStripItem>
          </div>
          <div className="lg:px-4">
            <MetaStripItem label="Status">
              <ActiveBadge active={service.is_active} />
            </MetaStripItem>
          </div>
          <div className="lg:px-4">
            <MetaStripItem label="Template">
              <span className="inline-flex max-w-full items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200 truncate">
                {templatePill}
              </span>
            </MetaStripItem>
          </div>
          <div className="lg:pl-4">
            <MetaStripItem label="Created">
              <span className="inline-flex items-center gap-1.5 font-normal text-zinc-700">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden />
                {formatDateTime(service.created_at)}
              </span>
            </MetaStripItem>
          </div>
        </div>
      </div>

      {isWhatsapp ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-500" aria-hidden />
                <h3 className="text-sm font-semibold text-zinc-900">Message Preview</h3>
              </div>
              {waLookup.loading ? (
                <p className="text-sm text-zinc-500">Loading template preview…</p>
              ) : waLookup.error ? (
                <p className="text-sm text-red-600">{waLookup.error}</p>
              ) : whatsappPreviewText ? (
                <WhatsappTemplateMessagePreview
                  bodyText={whatsappPreviewText}
                  headerFormat={waLookup.meta?.header_format}
                  headerUrl={whatsappPreviewHeaderUrl}
                  headerLabel={whatsappPreviewHeaderLabel}
                  className="max-w-none"
                  showCaption={false}
                />
              ) : (
                <p className="text-sm text-zinc-500">
                  {service.template_name?.trim()
                    ? "No preview available for this template."
                    : "No template name configured."}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Template variables (use {"{{field}}"} or literal text)
              </h3>
              {slotRows.length > 0 ? (
                <div className="space-y-2">
                  {slotRows.map((row) => (
                    <div key={row.index} className="flex gap-2 items-start">
                      <span className="text-xs text-zinc-500 w-6 pt-2 shrink-0">{row.index}</span>
                      <div className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 font-mono break-all">
                        {row.display || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No template variables mapped.</p>
              )}
            </div>
          </div>

          {waLookup.meta ? (
            <WhatsappTemplateMetaStatus meta={waLookup.meta} />
          ) : waLookup.loading ? (
            <p className="text-xs text-zinc-500">Looking up Meta template status…</p>
          ) : null}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-500" aria-hidden />
              <h3 className="text-sm font-semibold text-zinc-900">Email Preview</h3>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
              <span className="text-zinc-500">Subject:</span> {emailSubject}
            </div>
            <div className="rounded-lg border border-zinc-200 p-3 min-h-[160px]">
              {emailHasHtml ? (
                <div
                  className="prose prose-sm max-w-none text-zinc-900"
                  dangerouslySetInnerHTML={{
                    __html: service.email_html?.trim() || "<p>(empty)</p>",
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-zinc-900 font-sans">
                  {emailPlain || "(empty)"}
                </pre>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Plain text</h3>
            {emailPlain ? (
              <pre className="whitespace-pre-wrap text-sm text-zinc-800 rounded-lg border border-zinc-200 bg-zinc-50 p-3 min-h-[160px] font-sans">
                {emailPlain}
              </pre>
            ) : (
              <p className="text-sm text-zinc-500">
                {emailHasHtml
                  ? "No plain-text body stored for this service (HTML only)."
                  : "No plain-text body configured."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
