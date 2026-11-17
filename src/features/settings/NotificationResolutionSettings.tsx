import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SettingsFormCard } from "./SettingsFormCard";
import { getApiError, platformSettingsApi } from "../../lib/api";

type NotificationResolutionSettingsProps = {
  canEdit: boolean;
};

export function NotificationResolutionSettings({ canEdit }: NotificationResolutionSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [strict, setStrict] = useState(true);
  const [savedStrict, setSavedStrict] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformSettingsApi.getNotificationResolution();
      const value = res.data.data?.strict_engagement_notification_bindings ?? true;
      setStrict(value);
      setSavedStrict(value);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await platformSettingsApi.patchNotificationResolution({
        strict_engagement_notification_bindings: strict,
      });
      const value = res.data.data?.strict_engagement_notification_bindings ?? strict;
      setStrict(value);
      setSavedStrict(value);
      setSuccess("Saved notification resolution policy.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-500 py-8" aria-busy="true">
        Loading notification settings…
      </div>
    );
  }

  const helpText = strict
    ? "For each event, only bindings on that engagement count. If nothing is configured for that event, no message is sent—even if defaults exist under Notifications."
    : "If an engagement has no bindings for an event, the system uses default bindings from Notifications (global and per journey type).";

  return (
    <SettingsFormCard
      title="Notification resolution"
      description="Control how the system chooses which notification bindings to use when an engagement event is fired."
      error={error}
      success={success}
      dirty={strict !== savedStrict}
      saving={saving}
      readOnly={!canEdit}
      saveLabel="Save"
      onSubmit={(e) => void handleSave(e)}
      onDiscard={() => setStrict(savedStrict)}
    >
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 rounded border-zinc-300"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
            disabled={!canEdit}
          />
          <span className="text-sm text-zinc-900">
            <span className="font-medium">Use only engagement-specific notifications</span>
            <span className="block text-xs text-zinc-500 mt-1">{helpText}</span>
          </span>
        </label>
        <Link
          to="/notifications/notifications"
          className="inline-block text-xs text-zinc-600 hover:text-zinc-900 underline-offset-2 hover:underline"
        >
          Manage default bindings in Notifications →
        </Link>
      </div>
    </SettingsFormCard>
  );
}