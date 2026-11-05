import { Loader2, Save } from "lucide-react";
import type { ReactNode, FormEventHandler } from "react";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent";

export { inputClass };

export function SettingsSectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider col-span-full">
      {children}
    </p>
  );
}

export function SettingsFormCard({
  title,
  description,
  children,
  error,
  success,
  dirty,
  saving,
  readOnly,
  saveLabel = "Save",
  saveDisabled = false,
  saveDisabledReason,
  onSubmit,
  onDiscard,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  error?: string | null;
  success?: string | null;
  dirty?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  saveLabel?: string;
  saveDisabled?: boolean;
  saveDisabledReason?: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onDiscard?: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description ? <p className="text-xs text-zinc-500 mt-1 max-w-2xl">{description}</p> : null}
        </div>
        {children}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      </div>
      {!readOnly ? (
        <div className="flex flex-col items-end gap-1 border-t border-zinc-100 px-5 py-3">
          {saveDisabled && saveDisabledReason ? (
            <p className="text-xs text-amber-800 text-right max-w-md">{saveDisabledReason}</p>
          ) : null}
          <div className="flex items-center justify-end gap-2 w-full">
          {onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Discard
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!dirty || saving || saveDisabled}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveLabel}
          </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
