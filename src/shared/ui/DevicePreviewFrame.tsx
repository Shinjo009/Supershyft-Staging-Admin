import { useState, type ReactNode } from "react";

export type DeviceMode = "web" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<DeviceMode, number> = {
  web: 1280,
  tablet: 768,
  mobile: 390,
};

const DEVICE_LABEL: Record<DeviceMode, string> = {
  web: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

type FrameProps = {
  children: ReactNode;
  mode?: DeviceMode;
  onModeChange?: (mode: DeviceMode) => void;
  toolbarExtra?: ReactNode;
  className?: string;
};

export function DevicePreviewFrame({
  children,
  mode: controlledMode,
  onModeChange,
  toolbarExtra,
  className = "",
}: FrameProps) {
  const [internalMode, setInternalMode] = useState<DeviceMode>("web");
  const mode = controlledMode ?? internalMode;
  const setMode = (next: DeviceMode) => {
    onModeChange?.(next);
    if (controlledMode == null) setInternalMode(next);
  };
  const width = DEVICE_WIDTH[mode];

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
          {(Object.keys(DEVICE_WIDTH) as DeviceMode[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
              }`}
              onClick={() => setMode(key)}
            >
              {DEVICE_LABEL[key]}
            </button>
          ))}
        </div>
        {toolbarExtra}
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-zinc-100 p-4 sm:p-6">
        <div
          className="flex min-h-[28rem] w-full max-w-full flex-col overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm"
          style={{ width: Math.min(width, 1280), maxWidth: "100%" }}
        >
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
