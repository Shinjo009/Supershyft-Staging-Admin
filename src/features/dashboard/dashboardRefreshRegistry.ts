type DashboardRefreshHandler = () => void;

let refreshHandler: DashboardRefreshHandler | null = null;

export function registerDashboardRefresh(handler: DashboardRefreshHandler | null) {
  refreshHandler = handler;
}

export function runDashboardRefresh() {
  refreshHandler?.();
}
