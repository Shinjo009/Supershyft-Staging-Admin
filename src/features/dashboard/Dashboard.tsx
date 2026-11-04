import { useCallback, useEffect, useRef } from "react";
import { usePermissions } from "../../contexts/PermissionContext";
import { AccessDenied } from "../../pages/AccessDenied";
import { CommandDashboard } from "./command/CommandDashboard";
import { registerDashboardRefresh } from "./dashboardRefreshRegistry";

export function Dashboard() {
  const { hasAnyAccess } = usePermissions();
  const commandRefetch = useRef<() => void>(() => undefined);
  const registerCommandRefetch = useCallback((refetch: () => void) => {
    commandRefetch.current = refetch;
  }, []);

  useEffect(() => {
    registerDashboardRefresh(() => {
      commandRefetch.current();
    });
    return () => registerDashboardRefresh(null);
  }, []);

  if (!hasAnyAccess) {
    return (
      <AccessDenied
        title="No admin access assigned"
        description="Your account is active, but no admin categories have been assigned yet. Contact a full administrator."
        showHome={false}
      />
    );
  }

  return (
    <div className="min-w-0">
      <CommandDashboard registerRefetch={registerCommandRefetch} />
    </div>
  );
}
