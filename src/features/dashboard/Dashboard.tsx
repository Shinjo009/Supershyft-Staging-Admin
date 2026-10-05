import { useCallback, useEffect, useRef, useState } from "react";
import { getApiError, usersApi } from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionContext";
import { AccessDenied } from "../../pages/AccessDenied";
import { registerDashboardRefresh } from "./dashboardRefreshRegistry";
import { OperationsDashboard } from "./operations/OperationsDashboard";
import type { MonthPoint } from "./operations/overviewChartUtils";

export function Dashboard() {
  const { canView, hasAnyAccess } = usePermissions();
  const showUsers = canView("users");
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [growth, setGrowth] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(showUsers);
  const [error, setError] = useState<string | null>(null);
  const operationsRefetch = useRef<() => void>(() => undefined);
  const registerOperationsRefetch = useCallback((refetch: () => void) => {
    operationsRefetch.current = refetch;
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!showUsers) {
      setTotalUsers(null);
      setActiveUsers(null);
      setGrowth([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [usersAll, usersActive, statsRes] = await Promise.all([
        usersApi.list({ limit: 1 }),
        usersApi.list({ limit: 1, status: "active" }),
        usersApi.stats(),
      ]);
      setTotalUsers(usersAll.data.meta.total ?? 0);
      setActiveUsers(usersActive.data.meta.total ?? 0);
      const statsPayload = statsRes.data.data ?? statsRes.data;
      const yearlyRows = Array.isArray(statsPayload.yearly_totals) ? statsPayload.yearly_totals : [];
      setGrowth(
        yearlyRows.map((row) => ({
          key: String(row.year),
          label: String(row.year),
          value: Number(row.total_users) || 0,
          count: row.new_users != null ? Number(row.new_users) : undefined,
        }))
      );
    } catch (err) {
      setError(getApiError(err));
      setGrowth([]);
    } finally {
      setLoading(false);
    }
  }, [showUsers]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    registerDashboardRefresh(() => {
      void fetchUsers();
      operationsRefetch.current();
    });
    return () => registerDashboardRefresh(null);
  }, [fetchUsers]);

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
      <OperationsDashboard
        registerRefetch={registerOperationsRefetch}
        users={{
          show: showUsers,
          total: totalUsers,
          active: activeUsers,
          growth,
          loading,
          error,
        }}
      />
    </div>
  );
}
