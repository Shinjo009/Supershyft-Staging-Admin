import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionProvider, usePermissions } from "./contexts/PermissionContext";
import type { PermissionCategory } from "./auth/permissions";
import { AccessDenied } from "./pages/AccessDenied";
import { AdminLayout } from "./layouts/AdminLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./features/dashboard/Dashboard";
import { PublicServiceabilityPage } from "./features/serviceability/PublicServiceabilityPage";

import { loginPathWithRedirect } from "./lib/authStorage";

const Organisations = lazy(() =>
  import("./features/organisations/Organisations").then((m) => ({ default: m.Organisations }))
);
const CampReportsPage = lazy(() =>
  import("./features/organisations/CampReportsPage").then((m) => ({ default: m.CampReportsPage }))
);
const Engagements = lazy(() =>
  import("./features/engagements/Engagements").then((m) => ({ default: m.Engagements }))
);
const EngagementDetailPage = lazy(() =>
  import("./features/engagements/EngagementDetailPage").then((m) => ({ default: m.EngagementDetailPage }))
);
const EngagementFormPage = lazy(() =>
  import("./features/engagements/EngagementFormPage").then((m) => ({ default: m.EngagementFormPage }))
);
const Employees = lazy(() =>
  import("./features/employees/Employees").then((m) => ({ default: m.Employees }))
);
const Partners = lazy(() =>
  import("./features/partners/Partners").then((m) => ({ default: m.Partners }))
);
const AssessmentPackages = lazy(() =>
  import("./features/assessments/AssessmentPackages").then((m) => ({ default: m.AssessmentPackages }))
);
const Users = lazy(() => import("./features/users/Users").then((m) => ({ default: m.Users })));
const ParticipantJourneyPage = lazy(() =>
  import("./features/users/ParticipantJourneyPage").then((m) => ({ default: m.ParticipantJourneyPage }))
);
const DiagnosticPackages = lazy(() =>
  import("./features/diagnostics/DiagnosticPackages").then((m) => ({ default: m.DiagnosticPackages }))
);
const DiagnosticPackageDetailPage = lazy(() =>
  import("./features/diagnostics/DiagnosticPackageDetailPage").then((m) => ({
    default: m.DiagnosticPackageDetailPage,
  }))
);
const DiagnosticPackageFormPage = lazy(() =>
  import("./features/diagnostics/DiagnosticPackageFormPage").then((m) => ({
    default: m.DiagnosticPackageFormPage,
  }))
);
const Bookings = lazy(() =>
  import("./features/payments/Bookings").then((m) => ({ default: m.Bookings }))
);
const Discounts = lazy(() =>
  import("./features/discounts/Discounts").then((m) => ({ default: m.Discounts }))
);
const DiagnosticFilterChips = lazy(() =>
  import("./features/diagnostics/DiagnosticFilterChips").then((m) => ({ default: m.DiagnosticFilterChips }))
);
const SupportTickets = lazy(() =>
  import("./features/support/SupportTickets").then((m) => ({ default: m.SupportTickets }))
);
const ChecklistTemplates = lazy(() =>
  import("./features/checklists/ChecklistTemplates").then((m) => ({ default: m.ChecklistTemplates }))
);
const HealthMetrics = lazy(() =>
  import("./features/health-metrics/HealthMetrics").then((m) => ({ default: m.HealthMetrics }))
);
const MyTasks = lazy(() =>
  import("./features/checklists/MyTasks").then((m) => ({ default: m.MyTasks }))
);
const Settings = lazy(() =>
  import("./features/settings/Settings").then((m) => ({ default: m.Settings }))
);
const Experts = lazy(() => import("./features/experts/Experts").then((m) => ({ default: m.Experts })));
const ExpertPortalPage = lazy(() =>
  import("./features/experts/ExpertPortalPage").then((m) => ({ default: m.ExpertPortalPage }))
);
const ExpertMePage = lazy(() =>
  import("./features/experts/ExpertMePage").then((m) => ({ default: m.ExpertMePage }))
);
const ExpertAvailabilityPage = lazy(() =>
  import("./features/experts/ExpertAvailabilityPage").then((m) => ({ default: m.ExpertAvailabilityPage }))
);
const ExpertRequestsPage = lazy(() =>
  import("./features/experts/ExpertRequestsPage").then((m) => ({ default: m.ExpertRequestsPage }))
);
const ExpertUpcomingPage = lazy(() =>
  import("./features/experts/ExpertUpcomingPage").then((m) => ({ default: m.ExpertUpcomingPage }))
);
const ExpertConsultationManagePage = lazy(() =>
  import("./features/experts/ExpertConsultationManagePage").then((m) => ({
    default: m.ExpertConsultationManagePage,
  }))
);
const ExpertCampConsultationsPage = lazy(() =>
  import("./features/experts/ExpertCampConsultationsPage").then((m) => ({
    default: m.ExpertCampConsultationsPage,
  }))
);
const ExpertCampConsultationParticipantsPage = lazy(() =>
  import("./features/experts/ExpertCampConsultationParticipantsPage").then((m) => ({
    default: m.ExpertCampConsultationParticipantsPage,
  }))
);
const Notifications = lazy(() =>
  import("./features/notifications/Notifications").then((m) => ({ default: m.Notifications }))
);
const EngagementConsolePage = lazy(() =>
  import("./features/console/EngagementConsolePage").then((m) => ({ default: m.EngagementConsolePage }))
);
const ConsoleEngagementsPage = lazy(() =>
  import("./features/console/ConsoleEngagementsPage").then((m) => ({ default: m.ConsoleEngagementsPage }))
);
const ServerHealth = lazy(() =>
  import("./features/server/ServerHealth").then((m) => ({ default: m.ServerHealth }))
);
const IntegrationLogsPage = lazy(() =>
  import("./features/integration-logs/IntegrationLogsPage").then((m) => ({ default: m.IntegrationLogsPage }))
);
const BlogDashboard = lazy(() =>
  import("./features/blog/BlogDashboard").then((m) => ({ default: m.BlogDashboard }))
);
const BlogEditor = lazy(() =>
  import("./features/blog/BlogEditor").then((m) => ({ default: m.BlogEditor }))
);
const BlogPreview = lazy(() =>
  import("./features/blog/BlogPreview").then((m) => ({ default: m.BlogPreview }))
);

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-pulse text-zinc-500 text-sm">Loading page…</div>
    </div>
  );
}


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPathWithRedirect(location.pathname, location.search)}
        replace
      />
    );
  }
  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { employeeRole, authKind, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  // Partner org managers and authors use AdminLayout — not the phlebo/expert bounce.
  if (authKind === "partner" && (employeeRole === "organization_manager" || employeeRole === "author")) {
    return <>{children}</>;
  }
  if (authKind === "partner" || employeeRole === "expert" || employeeRole === "phlebo") {
    if (employeeRole === "expert") {
      return <Navigate to="/experts/portal" replace />;
    }
    return <Navigate to="/engagements/console" replace />;
  }
  if (employeeRole === "onboarding_assistant") {
    return <Navigate to="/engagements/console" replace />;
  }
  return <>{children}</>;
}

function EmployeeRequiredRoute({ children }: { children: React.ReactNode }) {
  const { employeeRole, authKind, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  const isPhlebo =
    employeeRole === "phlebo" ||
    employeeRole === "onboarding_assistant" ||
    (authKind === "partner" && employeeRole === "phlebo");
  const isStaffAdmin =
    (authKind === "employee" &&
      (employeeRole === "admin" || employeeRole === "inferior_admin")) ||
    employeeRole === "organization_manager";
  if (!employeeRole) {
    return <Navigate to="/login" replace />;
  }
  if (employeeRole === "expert" || (authKind === "partner" && employeeRole === "expert")) {
    return <Navigate to="/experts/portal" replace />;
  }
  if (!isPhlebo && !isStaffAdmin && employeeRole !== "onboarding_assistant") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ExpertPortalRoute({ children }: { children: React.ReactNode }) {
  const { employeeRole, authKind, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  const isExpert =
    employeeRole === "expert" || (authKind === "partner" && employeeRole === "expert");
  const isAdmin = authKind === "employee" && employeeRole === "admin";
  if (!isExpert && !isAdmin) {
    if (!employeeRole) {
      return <Navigate to="/login" replace />;
    }
    if (employeeRole === "organization_manager") {
      return <Navigate to="/organisations" replace />;
    }
    if (
      employeeRole === "onboarding_assistant" ||
      employeeRole === "phlebo" ||
      authKind === "partner"
    ) {
      return <Navigate to="/engagements/console" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function OrgManagerRoute({ children }: { children: React.ReactNode }) {
  const { employeeRole, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  if (employeeRole === "organization_manager") {
    const path = location.pathname;
    if (path === "/" || !path.startsWith("/organisations")) {
      return <Navigate to="/organisations" replace />;
    }
  }
  return <>{children}</>;
}

function AuthorRoute({ children }: { children: React.ReactNode }) {
  const { employeeRole, isLoading } = useAuth();
  const { canView } = usePermissions();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }
  const isAuthor = employeeRole === "author";
  const canUseBlog = isAuthor || employeeRole === "admin" || canView("blog");
  const onBlog = location.pathname === "/blog" || location.pathname.startsWith("/blog/");
  if (isAuthor && !onBlog) {
    return <Navigate to="/blog" replace />;
  }
  if (onBlog && !canUseBlog) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function PermissionRoute({
  category,
  children,
}: {
  category: PermissionCategory;
  children: React.ReactNode;
}) {
  const { canView } = usePermissions();
  return canView(category) ? <>{children}</> : <AccessDenied />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/serviceability" element={<PublicServiceabilityPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminOnlyRoute>
              <OrgManagerRoute>
                <AuthorRoute>
                  <AdminLayout />
                </AuthorRoute>
              </OrgManagerRoute>
            </AdminOnlyRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="organisations" element={<Navigate to="/organisations/organizations" replace />} />
        <Route path="organisations/camps/:campNo/reports" element={<PermissionRoute category="reports"><CampReportsPage /></PermissionRoute>} />
        <Route path="organisations/:tab" element={<PermissionRoute category="organizations"><Organisations /></PermissionRoute>} />
        <Route path="engagements" element={<PermissionRoute category="engagements"><Engagements /></PermissionRoute>} />
        <Route
          path="engagements/new"
          element={
            <PermissionRoute category="engagements">
              <EngagementFormPage mode="add" />
            </PermissionRoute>
          }
        />
        <Route
          path="engagements/:engagementCode/edit"
          element={
            <PermissionRoute category="engagements">
              <EngagementFormPage mode="edit" />
            </PermissionRoute>
          }
        />
        <Route
          path="engagements/:engagementCode"
          element={
            <PermissionRoute category="engagements">
              <EngagementDetailPage />
            </PermissionRoute>
          }
        />
        <Route path="employees" element={<Navigate to="/employees/employees" replace />} />
        <Route path="employees/:tab" element={<PermissionRoute category="employees"><Employees /></PermissionRoute>} />
        <Route path="partners" element={<PermissionRoute category="partners"><Partners /></PermissionRoute>} />
        <Route path="blog" element={<PermissionRoute category="blog"><BlogDashboard /></PermissionRoute>} />
        <Route path="blog/editor" element={<PermissionRoute category="blog"><BlogEditor /></PermissionRoute>} />
        <Route path="blog/editor/:id" element={<PermissionRoute category="blog"><BlogEditor /></PermissionRoute>} />
        <Route path="blog/view/:id" element={<PermissionRoute category="blog"><BlogPreview /></PermissionRoute>} />
        <Route
          path="assessments"
          element={<Navigate to="/assessments/packages" replace />}
        />
        <Route path="assessments/:tab" element={<PermissionRoute category="assessments"><AssessmentPackages /></PermissionRoute>} />
        <Route
          path="assessment"
          element={<Navigate to="/assessments/packages" replace />}
        />
        <Route
          path="assessment/packages"
          element={<Navigate to="/assessments/packages" replace />}
        />
        <Route
          path="assessment/categories"
          element={<Navigate to="/assessments/categories" replace />}
        />
        <Route
          path="assessment/questions"
          element={<Navigate to="/assessments/questions" replace />}
        />
        <Route
          path="assessment-packages"
          element={<Navigate to="/assessments/packages" replace />}
        />
        <Route
          path="assessment-packages/packages"
          element={<Navigate to="/assessments/packages" replace />}
        />
        <Route
          path="assessment-packages/categories"
          element={<Navigate to="/assessments/categories" replace />}
        />
        <Route
          path="assessment-packages/questions"
          element={<Navigate to="/assessments/questions" replace />}
        />
        <Route path="users/:userId/journey" element={<PermissionRoute category="users"><ParticipantJourneyPage /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute category="users"><Users /></PermissionRoute>} />
        <Route path="experts" element={<PermissionRoute category="experts"><Experts /></PermissionRoute>} />
        <Route path="diagnostics" element={<Navigate to="/diagnostics/packages" replace />} />
        <Route
          path="diagnostics/packages/new"
          element={
            <PermissionRoute category="diagnostics">
              <DiagnosticPackageFormPage mode="add" />
            </PermissionRoute>
          }
        />
        <Route
          path="diagnostics/packages/:packageId/edit"
          element={
            <PermissionRoute category="diagnostics">
              <DiagnosticPackageFormPage mode="edit" />
            </PermissionRoute>
          }
        />
        <Route
          path="diagnostics/packages/:packageId"
          element={
            <PermissionRoute category="diagnostics">
              <DiagnosticPackageDetailPage />
            </PermissionRoute>
          }
        />
        <Route path="diagnostics/packages" element={<PermissionRoute category="diagnostics"><DiagnosticPackages /></PermissionRoute>} />
        <Route path="diagnostics/filters-chips" element={<PermissionRoute category="diagnostics"><DiagnosticFilterChips /></PermissionRoute>} />
        <Route path="discounts" element={<PermissionRoute category="discounts"><Discounts /></PermissionRoute>} />
        <Route path="payments" element={<Navigate to="/payments/bookings" replace />} />
        <Route path="payments/bookings" element={<PermissionRoute category="payments_bookings"><Bookings /></PermissionRoute>} />
        <Route path="checklists" element={<PermissionRoute category="checklists_tasks"><ChecklistTemplates /></PermissionRoute>} />
        <Route path="library/health-metrics" element={<PermissionRoute category="diagnostics"><HealthMetrics /></PermissionRoute>} />
        <Route path="notifications" element={<Navigate to="/notifications/notifications" replace />} />
        <Route path="notifications/:tab" element={<PermissionRoute category="notifications"><Notifications /></PermissionRoute>} />
        <Route
          path="admin/library/health-metrics"
          element={<Navigate to="/library/health-metrics" replace />}
        />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="support" element={<PermissionRoute category="support"><SupportTickets /></PermissionRoute>} />
        <Route path="server" element={<PermissionRoute category="system_monitoring"><ServerHealth /></PermissionRoute>} />
        <Route
          path="integration-logs"
          element={<PermissionRoute category="system_monitoring"><IntegrationLogsPage /></PermissionRoute>}
        />
        <Route path="settings" element={<Navigate to="/settings/onboarding" replace />} />
        <Route path="settings/:tab" element={<PermissionRoute category="platform_settings"><Settings /></PermissionRoute>} />
      </Route>
      <Route
        path="/engagements/console"
        element={
          <ProtectedRoute>
            <EmployeeRequiredRoute>
              <PermissionRoute category="engagement_console">
                <ConsoleEngagementsPage />
              </PermissionRoute>
            </EmployeeRequiredRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/engagements/:engagementId/console"
        element={
          <ProtectedRoute>
            <EmployeeRequiredRoute>
              <PermissionRoute category="engagement_console">
                <EngagementConsolePage />
              </PermissionRoute>
            </EmployeeRequiredRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/portal"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertPortalPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/portal/availability"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertAvailabilityPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/requests"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertRequestsPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/upcoming"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertUpcomingPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/portal/camp-consultations"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertCampConsultationsPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/portal/camp-consultations/:engagementId"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertCampConsultationParticipantsPage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/consultation/:consultationId/manage"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertConsultationManagePage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts/me"
        element={
          <ProtectedRoute>
            <ExpertPortalRoute>
              <ExpertMePage />
            </ExpertPortalRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <AppRoutes />
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
