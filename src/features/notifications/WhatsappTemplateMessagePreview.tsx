import { FileText, ExternalLink } from "lucide-react";
import { useState } from "react";

type Props = {
  bodyText: string;
  headerFormat?: string | null;
  headerUrl?: string | null;
  headerLabel?: string | null;
  className?: string;
  /** @deprecated use bodyText */
  message?: string;
};

function HeaderMediaFallback({
  format,
  url,
  label,
}: {
  format: string;
  url: string;
  label?: string | null;
}) {
  return (
    <div className="rounded-md bg-white/60 border border-emerald-200/80 p-2 text-xs text-zinc-700">
      <p className="font-medium text-zinc-800">Meta sample {format.toLowerCase()}</p>
      {label ? <p className="truncate mt-0.5">{label}</p> : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-1 text-emerald-900 underline"
      >
        Open sample <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function PreviewHeaderBlock({
  format,
  url,
  label,
}: {
  format: string;
  url: string;
  label?: string | null;
}) {
  const fmt = format.toUpperCase();
  const [mediaFailed, setMediaFailed] = useState(false);

  if (mediaFailed) {
    return <HeaderMediaFallback format={fmt} url={url} label={label} />;
  }

  if (fmt === "IMAGE") {
    return (
      <img
        src={url}
        alt="Template header preview"
        className="w-full max-h-48 object-cover rounded-t-md"
        onError={() => setMediaFailed(true)}
      />
    );
  }

  if (fmt === "VIDEO") {
    return (
      <video
        src={url}
        controls
        className="w-full max-h-48 rounded-t-md bg-black"
        onError={() => setMediaFailed(true)}
      />
    );
  }

  if (fmt === "DOCUMENT") {
    const docLabel = label?.trim() || "PDF document";
    const looksPdf = /\.pdf(\?|$)/i.test(url) || docLabel.toLowerCase().endsWith(".pdf");
    return (
      <div className="space-y-2 pb-1">
        <div className="flex items-center gap-2 px-1 text-xs text-zinc-800">
          <FileText className="w-4 h-4 shrink-0 text-emerald-900" />
          <span className="truncate font-medium">{docLabel}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 text-emerald-900 underline inline-flex items-center gap-0.5"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {looksPdf && !mediaFailed ? (
          <iframe
            title="Document preview"
            src={url}
            className="w-full h-40 rounded border-0 bg-white"
            onError={() => setMediaFailed(true)}
          />
        ) : (
          <HeaderMediaFallback format={fmt} url={url} label={docLabel} />
        )}
      </div>
    );
  }

  if (fmt === "TEXT") {
    return <p className="text-sm font-semibold text-zinc-900 px-1 pb-1">{label || url}</p>;
  }

  return <HeaderMediaFallback format={fmt} url={url} label={label} />;
}

export function WhatsappTemplateMessagePreview({
  bodyText,
  message,
  headerFormat,
  headerUrl,
  headerLabel,
  className = "",
}: Props) {
  const text = (bodyText ?? message ?? "").trim() || "(empty template body)";
  const fmt = (headerFormat ?? "").trim().toUpperCase();
  const url = (headerUrl ?? "").trim();
  const showHeader = url && fmt && fmt !== "NONE";

  return (
    <div className={`max-w-md ${className}`}>
      <p className="text-xs text-zinc-500 mb-2">Message preview</p>
      <div
        className="rounded-lg rounded-tl-sm shadow-sm overflow-hidden border border-emerald-100/80"
        style={{ backgroundColor: "#dcf8c6" }}
      >
        {showHeader ? (
          <div className="px-2 pt-2">
            <PreviewHeaderBlock format={fmt} url={url} label={headerLabel} />
          </div>
        ) : null}
        <div className="px-3 py-2 text-sm text-zinc-900 whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}
