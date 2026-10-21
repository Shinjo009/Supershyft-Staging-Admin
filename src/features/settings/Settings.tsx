import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermissions } from "../../contexts/PermissionContext";
import { SettingsPage } from "./SettingsPage";

export const SETTINGS_TAB_KEYS = ["onboarding", "notifications", "integrations", "platform"] as const;
export type SettingsTabKey = (typeof SETTINGS_TAB_KEYS)[number];

const TAB_LABELS: Record<SettingsTabKey, string> = {
  onboarding: "Onboarding",
  notifications: "Notifications",
  integrations: "Integrations",
  platform: "Platform",
};

export function Settings() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const { canViewTask } = usePermissions();
  const mayViewNotifications = canViewTask("notifications", "defaults");

  const visibleTabs = SETTINGS_TAB_KEYS.filter((t) => t !== "notifications" || mayViewNotifications);

  const activeTab: SettingsTabKey = SETTINGS_TAB_KEYS.includes((tabParam ?? "") as SettingsTabKey)
    ? (tabParam as SettingsTabKey)
    : "onboarding";

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      navigate(`/settings/${visibleTabs[0] ?? "onboarding"}`, { replace: true });
      return;
    }
    if (tabParam !== activeTab) {
      navigate(`/settings/${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate, tabParam, visibleTabs]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex gap-1 mb-5 border-b border-zinc-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => navigate(`/settings/${tab}`)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <SettingsPage activeTab={activeTab} />
    </div>
  );
}
