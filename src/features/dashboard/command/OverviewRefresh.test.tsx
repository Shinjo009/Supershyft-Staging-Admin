import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLayout } from "../../../layouts/AdminLayout";
import type { DashboardCommandBootstrap } from "../../../lib/api";
import { Dashboard } from "../Dashboard";

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    userProfile: { first_name: "Ada", last_name: "Admin" },
    userId: 1,
    displayName: "Ada Admin",
    employeeRole: "admin",
    pendingTaskCount: 0,
  }),
}));

vi.mock("../../../contexts/PermissionContext", () => ({
  usePermissions: () => ({
    hasAnyAccess: true,
    canView: () => true,
    canEdit: () => true,
  }),
}));

const commandMock = vi.fn();

vi.mock("../../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/api")>();
  return {
    ...actual,
    dashboardApi: {
      ...actual.dashboardApi,
      command: (...args: unknown[]) => commandMock(...args),
    },
  };
});

function bootstrap(cpu: number): DashboardCommandBootstrap {
  const split = { total: 4, b2b: 3, b2c: 1 };
  return {
    server_health: {
      cpu_usage: cpu,
      memory_usage: 22,
      storage_usage: 33,
      reported_at: null,
      source: "test",
    },
    notification_health: { sent: 1, failed: 0, pending: 0, total: 1 },
    booking_issues: { unserviceable: 0, payment_failed: 0, total: 0 },
    tickets: { open: 1, resolved: 0, closed: 0, solved: 2 },
    overview_kpis: {
      people_registered: { total: 10, b2b: null, b2c: null },
      tests_completed: split,
      questionnaire_done: split,
      reports_delivered: { total: 4, lab: 2, bio_ai: 2, b2b: 3, b2c: 1 },
      consultations: { ...split, doctor: 2, nutritionist: 2 },
      open_engagements: split,
    },
    action_center: {
      upcoming_collections: 1,
      overdue_collections: 0,
      blood_reports_pending: 0,
      questionnaire_pending: 0,
      bio_ai_pending: 0,
      consultations_pending: 0,
    },
    b2b: { lifecycle_counts: { ongoing: 1, upcoming: 0, completed: 0 }, camps: [], camps_total: 0 },
    b2c: {
      total_bookings: 0,
      collections_tomorrow: 0,
      tests_completed: 0,
      lab_reports_delivered: 0,
      bio_ai_reports_generated: 0,
      consultations: { total: 0, doctor: 0, nutritionist: 0 },
      package_performance: [],
      coupon_usage: [],
      tomorrows_collections: [],
    },
    filters: { audience: "all", from: null, to: null, lifecycle: "ongoing" },
    generated_at: "2026-11-05T00:00:00Z",
  };
}

function renderDashboard(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard/b2b" element={<Dashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Dashboard refresh", () => {
  let cpu = 12;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    cpu = 12;
    commandMock.mockReset();
    commandMock.mockImplementation(async () => ({ data: { data: bootstrap(cpu) } }));
  });

  it("loads Overview and refetches when the top Refresh button is clicked", async () => {
    renderDashboard();

    expect(await screen.findByText("Server load")).toBeInTheDocument();
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("People registered")).toBeInTheDocument();
    expect(screen.getByText("Tests completed")).toBeInTheDocument();
    expect(screen.getByText("Questionnaire done")).toBeInTheDocument();
    expect(screen.getByText("Reports delivered")).toBeInTheDocument();
    expect(screen.getByText("Consultations done")).toBeInTheDocument();
    expect(screen.getByText("Open engagements")).toBeInTheDocument();

    const before = commandMock.mock.calls.length;
    cpu = 40;
    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));

    await waitFor(() => expect(screen.getByText("40%")).toBeInTheDocument());
    expect(commandMock.mock.calls.length).toBeGreaterThan(before);
    expect(screen.getByRole("button", { name: "Refresh dashboard" })).toBeEnabled();
    expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
  });

  it("refetches B2B from the same header Refresh button", async () => {
    renderDashboard("/dashboard/b2b");

    expect(await screen.findByRole("button", { name: "Refresh dashboard" })).toBeInTheDocument();
    await waitFor(() => expect(commandMock).toHaveBeenCalled());
    const before = commandMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));

    await waitFor(() => expect(commandMock.mock.calls.length).toBeGreaterThan(before));
    const last = commandMock.mock.calls.at(-1)?.[0] as { audience?: string } | undefined;
    expect(last?.audience).toBe("b2b");
  });
});
