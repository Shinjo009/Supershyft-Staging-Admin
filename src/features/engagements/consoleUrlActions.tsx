import { useState } from "react";
import { Copy, ExternalLink, Link2, Monitor } from "lucide-react";
import { PermissionGate } from "../../contexts/PermissionContext";

export function consoleUrlForEngagement(engagementId: number): string {
  return `${window.location.origin}/engagements/${engagementId}/console`;
}

export function ConsoleUrlActions({
  engagementId,
  variant = "default",
}: {
  engagementId: number;
  variant?: "default" | "compact";
}) {
  const [copied, setCopied] = useState(false);
  const url = consoleUrlForEngagement(engagementId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  if (variant === "compact") {
    return (
      <PermissionGate category="engagement_console">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Monitor className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden />
            <span className="font-medium text-zinc-700 shrink-0">Engagement console</span>
            <span
              className="text-xs text-zinc-500 truncate min-w-0 hidden sm:inline"
              title={url}
            >
              {url}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium"
              title="Copy console URL"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          </div>
        </div>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate category="engagement_console">
      <div className="flex flex-col gap-2 mt-1">
        <code className="text-xs bg-zinc-100 px-2 py-1.5 rounded break-all text-zinc-700">{url}</code>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium"
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
          >
            <Link2 className="w-3.5 h-3.5" />
            Open Console
          </a>
        </div>
      </div>
    </PermissionGate>
  );
}
