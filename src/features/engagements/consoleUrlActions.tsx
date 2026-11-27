import { useState } from "react";
import { Copy, ExternalLink, Link2, Monitor, Share2 } from "lucide-react";
import { PermissionGate } from "../../contexts/PermissionContext";

export function consoleUrlForEngagement(engagementId: number): string {
  return `${window.location.origin}/engagements/${engagementId}/console`;
}

export function consoleSubpathForEngagement(options: {
  engagementId: number;
  engagementCode?: string | null;
}): string {
  const code = (options.engagementCode ?? "").trim();
  if (code) {
    return `/engagements/code/${encodeURIComponent(code)}/console`;
  }
  return `/engagements/${options.engagementId}/console`;
}

export function consoleUrlForEngagementCode(code: string): string {
  const trimmed = code.trim();
  return `${window.location.origin}/engagements/code/${encodeURIComponent(trimmed)}/console`;
}

function resolveConsoleUrl(engagementId: number, engagementCode?: string | null): string {
  const code = (engagementCode ?? "").trim();
  if (code) {
    return consoleUrlForEngagementCode(code);
  }
  return consoleUrlForEngagement(engagementId);
}

export function ConsoleUrlActions({
  engagementId,
  engagementCode,
  engagementName,
  variant = "default",
}: {
  engagementId: number;
  engagementCode?: string | null;
  engagementName?: string | null;
  variant?: "default" | "compact";
}) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const url = resolveConsoleUrl(engagementId, engagementCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleShare = async () => {
    const shareTitle = "Engagement console";
    const shareText = (engagementName ?? "").trim() || shareTitle;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      }
    }
    setShareCopied(true);
    try {
      await navigator.clipboard.writeText(url);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
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
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium"
              title="Share console URL"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareCopied ? "Copied" : "Share"}
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
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium"
          >
            <Share2 className="w-3.5 h-3.5" />
            {shareCopied ? "Copied" : "Share"}
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