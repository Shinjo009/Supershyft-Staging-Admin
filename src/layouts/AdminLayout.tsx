import { useMemo, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  ClipboardList,
  FlaskConical,
  UserRound,
  Menu,
  LogOut,
  X,
  LifeBuoy,
  ClipboardCheck,
  Activity,
  Inbox,
  Library,
  ChevronDown,
  CreditCard,
  Stethoscope,
  Bell,
  Settings,
  Server,
  Handshake,
  Tag,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionContext";
import type { PermissionCategory } from "../auth/permissions";
import { runDashboardRefresh } from "../features/dashboard/dashboardRefreshRegistry";

const primaryNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true as const, category: null },
  { to: "/users", icon: UserRound, label: "Users", category: "users" },
  { to: "/experts", icon: Stethoscope, label: "Experts", category: "experts" },
  { to: "/organisations", icon: Building2, label: "Organisations", category: "organizations" },
  { to: "/engagements", icon: CalendarCheck, label: "Engagements", category: "engagements" },
  { to: "/support", icon: LifeBuoy, label: "Support", category: "support" },
  { to: "/server", icon: Server, label: "Server", category: "system_monitoring" },
  { to: "/settings", icon: Settings, label: "Settings", category: "platform_settings" },
  { to: "/employees", icon: Users, label: "Employees", category: "employees" },
  { to: "/partners", icon: Handshake, label: "Partners", category: "partners" },
];

const libraryNavItems = [
  { to: "/assessments/packages", icon: ClipboardList, label: "Assessments", category: "assessments" },
  { to: "/diagnostics/packages", icon: FlaskConical, label: "Diagnostics", category: "diagnostics" },
  { to: "/discounts", icon: Tag, label: "Discounts", category: "discounts" },
  { to: "/payments/bookings", icon: CreditCard, label: "Payments", category: "payments_bookings" },
  { to: "/checklists", icon: ClipboardCheck, label: "Checklist templates", category: "checklists_tasks" },
  { to: "/library/health-metrics", icon: Activity, label: "Health Metrics", category: "diagnostics" },
  { to: "/notifications/notifications", icon: Bell, label: "Notifications", category: "notifications" },
];

const orgManagerNavItems = [
  { to: "/organisations", icon: Building2, label: "Organisations" },
  { to: "/engagements/console", icon: CalendarCheck, label: "Engagement Console" },
];

function isLibraryPath(pathname: string) {
  return (
    pathname.startsWith("/assessments") ||
    pathname.startsWith("/diagnostics") ||
    pathname.startsWith("/discounts") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/checklists") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/notifications")
  );
}

function pageTitleForPath(pathname: string): string {
  const exact: Record<string, string> = {
    "/": "Dashboard",
    "/users": "Users",
    "/experts": "Experts",
    "/organisations": "Organisations",
    "/engagements": "Engagements",
    "/engagements/console": "Engagement Console",
    "/support": "Support Tickets",
    "/server": "Server",
    "/settings": "Settings",
    "/employees": "Employees",
    "/partners": "Partners",
    "/my-tasks": "My Tasks",
    "/assessments/packages": "Assessments",
    "/diagnostics/packages": "Diagnostics",
    "/discounts": "Discounts",
    "/payments/bookings": "Payments",
    "/checklists": "Checklist Templates",
    "/library/health-metrics": "Health Metrics",
    "/notifications/notifications": "Notifications",
  };
  if (exact[pathname]) return exact[pathname];

  if (pathname.startsWith("/users/")) return "Users";
  if (pathname.startsWith("/experts/")) return "Experts";
  if (pathname.startsWith("/organisations/")) return "Organisations";
  if (pathname.startsWith("/engagements/")) return "Engagements";
  if (pathname.startsWith("/assessments/")) return "Assessments";
  if (pathname.startsWith("/diagnostics/")) return "Diagnostics";
  if (pathname.startsWith("/payments/")) return "Payments";
  if (pathname.startsWith("/notifications/")) return "Notifications";
  if (pathname.startsWith("/checklists/")) return "Checklist templates";
  if (pathname.startsWith("/library/")) return "Health Metrics";
  if (pathname.startsWith("/server")) return "Server";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/support")) return "Support Tickets";
  if (pathname.startsWith("/employees")) return "Employees";
  if (pathname.startsWith("/partners")) return "Partners";
  if (pathname.startsWith("/discounts")) return "Discounts";
  if (pathname.startsWith("/checklists")) return "Checklist Templates";
  return "Admin";
}

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout, userProfile, userId, displayName, employeeRole, pendingTaskCount } = useAuth();
  const { canView } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const pendingBadgeCount =
    employeeRole === "organization_manager" ? null : pendingTaskCount;
  const [libraryOpen, setLibraryOpen] = useState(() => isLibraryPath(location.pathname));
  const libraryExpanded = libraryOpen || isLibraryPath(location.pathname);
  const isOrgManager = employeeRole === "organization_manager";
  const visiblePrimaryItems = primaryNavItems.filter(
    (item) => item.category === null || canView(item.category as PermissionCategory)
  );
  const visibleLibraryItems = libraryNavItems.filter((item) =>
    canView(item.category as PermissionCategory)
  );
  const pageTitle = useMemo(() => pageTitleForPath(location.pathname), [location.pathname]);
  const isDashboard = location.pathname === "/";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleMobileMenu = () => setMobileMenuOpen((o) => !o);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
    }`;

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden
        />
      )}

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col bg-white border-r border-zinc-200 transition-transform duration-200 ease-out
          ${sidebarCollapsed ? "w-16" : "w-56"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <img
                src="/super-shyft.png"
                alt="Super Shyft"
                className="h-7 w-7 rounded-sm object-contain"
              />
              <span className="font-semibold text-zinc-900 tracking-tight">
                {employeeRole === "inferior_admin" ? "Admin Workspace" : "Admin"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden lg:block p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={closeMobileMenu}
              className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {isOrgManager ? (
            orgManagerNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `${navLinkClass({ isActive })} ${sidebarCollapsed ? "justify-center" : ""}`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </NavLink>
            ))
          ) : (
            <>
          {visiblePrimaryItems.slice(0, 4).map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? false}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} ${sidebarCollapsed ? "justify-center" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {sidebarCollapsed ? (
            visibleLibraryItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={closeMobileMenu}
                title={label}
                className={({ isActive }) =>
                  `${navLinkClass({ isActive })} justify-center`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
              </NavLink>
            ))
          ) : visibleLibraryItems.length > 0 ? (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setLibraryOpen((o) => !o)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isLibraryPath(location.pathname)
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
                aria-expanded={libraryExpanded}
              >
                <Library className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">Library</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform ${
                    libraryExpanded ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              {libraryExpanded && (
                <div className="mt-0.5 ml-2 pl-2 border-l border-zinc-200 space-y-0.5">
                  {visibleLibraryItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-zinc-100 text-zinc-900"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 opacity-80" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {visiblePrimaryItems
            .slice(4)
            .map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? false}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `${navLinkClass({ isActive })} ${sidebarCollapsed ? "justify-center" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
            </>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 flex items-center justify-between gap-3 px-4 sm:px-6 py-2 bg-white border-b border-zinc-200 shrink-0">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-zinc-900 truncate">{pageTitle}</h1>
            {isDashboard ? (
              <p className="text-[11px] text-zinc-500 truncate leading-tight">
                Overview of your admin panel
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isDashboard ? (
              <button
                type="button"
                onClick={() => runDashboardRefresh()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                aria-label="Refresh dashboard"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium">Refresh</span>
              </button>
            ) : null}
            {!isOrgManager && (
              <NavLink
                to="/my-tasks"
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`
                }
                title="My tasks"
                aria-label={
                  pendingBadgeCount != null && pendingBadgeCount > 0
                    ? `My tasks, ${pendingBadgeCount} pending`
                    : "My tasks"
                }
              >
                <Inbox className="w-5 h-5 shrink-0" />
                <span className="hidden sm:inline">Tasks</span>
                {pendingBadgeCount != null && pendingBadgeCount > 0 ? (
                  <span className="min-w-[1.125rem] h-5 px-1 rounded-full bg-zinc-900 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums leading-none">
                    {pendingBadgeCount > 99 ? "99+" : pendingBadgeCount}
                  </span>
                ) : null}
              </NavLink>
            )}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <span className="text-sm text-zinc-600 truncate max-w-[120px] sm:max-w-none">
                {displayName ||
                  (userProfile?.first_name || userProfile?.last_name
                    ? `${userProfile?.first_name ?? ""} ${userProfile?.last_name ?? ""}`.trim()
                    : userId ?? "—")}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 shrink-0"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
