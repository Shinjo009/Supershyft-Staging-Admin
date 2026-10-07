import { useCallback, useEffect, useRef } from "react";
import { usePermissions } from "../../contexts/PermissionContext";
import { AccessDenied } from "../../pages/AccessDenied";
import { registerDashboardRefresh } from "./dashboardRefreshRegistry";
import { OperationsDashboard } from "./operations/OperationsDashboard";

export function Dashboard() {
  const { hasAnyAccess } = usePermissions();
  const operationsRefetch = useRef<() => void>(() => undefined);
  const registerOperationsRefetch = useCallback((refetch: () => void) => {
    operationsRefetch.current = refetch;
  }, []);

  useEffect(() => {
    registerDashboardRefresh(() => {
      operationsRefetch.current();
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
    <div className="min-w-0 space-y-4">
      <OperationsDashboard registerRefetch={registerOperationsRefetch} />
    </div>
  );
}
