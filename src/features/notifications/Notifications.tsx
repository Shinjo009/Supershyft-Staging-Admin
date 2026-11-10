import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { usePermissions } from "../../contexts/PermissionContext";
import { buildIntegrationLogsPath } from "../integration-logs/integrationSyncLogsUtils";
import { NotificationLogsTab } from "./NotificationLogsTab";
import { NotificationServicesTab } from "./NotificationServicesTab";
import { NotificationBindingsTab } from "./NotificationBindingsTab";

export type NotificationsTabKey = "logs" | "services" | "notifications";

const TAB_KEYS: NotificationsTabKey[] = ["logs", "services", "notifications"];

const TAB_LABELS: Record<NotificationsTabKey, string> = {
  logs: "Logs",
  services: "Services",
  notifications: "Notifications",
};

function normalizeTabParam(param: string | undefined): NotificationsTabKey | "redirect" {
  if (!param || param === "events") return "redirect";
  if (TAB_KEYS.includes(param as NotificationsTabKey)) return param as NotificationsTabKey;
  return "redirect";
}

export function Notifications() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const { canViewTask } = usePermissions();

  const mayViewLogs = canViewTask("notifications", "messages");
  const mayViewServices = canViewTask("notifications", "services");
  const mayViewBindings = canViewTask("notifications", "defaults");

  const visibleTabs = useMemo(
    () =>
      TAB_KEYS.filter((tab) => {
        if (tab === "logs") return mayViewLogs;
        if (tab === "services") return mayViewServices;
        return mayViewBindings;
      }),
    [mayViewBindings, mayViewLogs, mayViewServices]
  );

  const normalized = normalizeTabParam(tabParam);

  useEffect(() => {
    if (tabParam === "events") {
      navigate("/notifications/notifications", { replace: true });
      return;
    }
    if (normalized === "redirect") {
      navigate("/notifications/logs", { replace: true });
    }
  }, [navigate, normalized, tabParam]);

  const activeTab: NotificationsTabKey =
    normalized === "redirect"
      ? visibleTabs[0] ?? "logs"
      : visibleTabs.includes(normalized)
        ? normalized
        : visibleTabs[0] ?? "logs";

  useEffect(() => {
    if (normalized !== "redirect" && !visibleTabs.includes(normalized) && visibleTabs.length > 0) {
      navigate(`/notifications/${visibleTabs[0]}`, { replace: true });
    }
  }, [navigate, normalized, visibleTabs]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeaderActions>
        {activeTab === "logs" && (
          <HeaderActionButton
            label="Sync Logs"
            icon={ScrollText}
            variant="secondary"
            onClick={() => navigate(buildIntegrationLogsPath({ provider: "n8n" }))}
          />
        )}
      </PageHeaderActions>

      <div className="flex gap-1 mb-5 border-b border-zinc-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => navigate(`/notifications/${tab}`)}
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

      {activeTab === "logs" && mayViewLogs && <NotificationLogsTab />}
      {activeTab === "services" && mayViewServices && <NotificationServicesTab />}
      {activeTab === "notifications" && mayViewBindings && <NotificationBindingsTab />}
    </div>
  );
}
