import type { WhatsappTemplateMeta } from "../../lib/api";

export function WhatsappTemplateMetaStatus({ meta }: { meta: WhatsappTemplateMeta }) {
  if (!meta.found) {
    return (
      <p className="text-xs text-amber-700 max-w-3xl">Template not found in Meta for this name.</p>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-xs space-y-1 max-w-3xl">
      <p>
        <span className="text-zinc-500">Status:</span>{" "}
        <span className={meta.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}>
          {meta.status}
        </span>
      </p>
      <p>
        Language: {meta.language} · Category: {meta.category} · Variables:{" "}
        {meta.body_positional_count ?? 0}
        {meta.header_format ? ` · Header: ${meta.header_format}` : ""}
        {meta.requires_header_document && !meta.header_format ? " · Header: media" : ""}
      </p>
      {meta.status !== "APPROVED" && (
        <p className="text-amber-700">Only APPROVED templates can be used for sending.</p>
      )}
    </div>
  );
}
