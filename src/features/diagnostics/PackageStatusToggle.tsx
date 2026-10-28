import { useState } from "react";
import { diagnosticPackagesApi, getApiError } from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionContext";

type Props = {
  packageId: number;
  status?: string | null;
  disabled?: boolean;
  packageName?: string;
  onStatusChange?: (nextStatus: "active" | "inactive") => void;
  onError?: (message: string) => void;
};

function isActive(status: string | null | undefined): boolean {
  return (status ?? "active").toLowerCase() === "active";
}

export function PackageStatusToggle({
  packageId,
  status,
  disabled = false,
  packageName,
  onStatusChange,
  onError,
}: Props) {
  const { canEdit } = usePermissions();
  const mayEdit = canEdit("diagnostics");
  const [updating, setUpdating] = useState(false);
  const active = isActive(status);

  if (!mayEdit) {
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    );
  }

  const toggle = async () => {
    if (disabled || updating) return;
    const next: "active" | "inactive" = active ? "inactive" : "active";
    setUpdating(true);
    try {
      await diagnosticPackagesApi.updateStatus(packageId, next);
      onStatusChange?.(next);
    } catch (err) {
      onError?.(getApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={disabled || updating}
        className={`inline-flex items-center w-12 h-6 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          active ? "bg-emerald-500" : "bg-zinc-300"
        }`}
        aria-pressed={active}
        aria-label={`Set ${packageName ?? "package"} ${active ? "inactive" : "active"}`}
      >
        <span
          className={`h-5 w-5 bg-white rounded-full shadow transform transition-transform ${
            active ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs text-zinc-500">{active ? "Active" : "Inactive"}</span>
    </div>
  );
}
