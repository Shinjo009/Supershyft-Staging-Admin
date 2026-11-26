import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Users } from "./Users";

vi.mock("../engagements/Engagements", () => ({
  Engagements: () => null,
}));
vi.mock("./OnboardUserModal", () => ({
  OnboardUserModal: () => null,
}));

vi.mock("../../contexts/PermissionContext", () => ({
  usePermissions: () => ({
    canView: () => true,
    canEdit: () => true,
    canEditTask: () => true,
    canViewTask: () => true,
  }),
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const listMock = vi.fn();
const statsMock = vi.fn();
const employeesGetMock = vi.fn();

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    usersApi: {
      ...actual.usersApi,
      list: (...args: unknown[]) => listMock(...args),
      stats: (...args: unknown[]) => statsMock(...args),
    },
    employeesApi: {
      ...actual.employeesApi,
      get: (...args: unknown[]) => employeesGetMock(...args),
    },
  };
});

describe("Users page load contract", () => {
  beforeEach(() => {
    listMock.mockResolvedValue({
      data: {
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          with_metsights_profile: 0,
          total_participants: 0,
          protected_user_ids: [],
        },
      },
    });
    statsMock.mockClear();
    employeesGetMock.mockClear();
  });

  it("does not call users/stats or employees/1 on mount", async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(statsMock).not.toHaveBeenCalled();
    expect(employeesGetMock).not.toHaveBeenCalled();
  });

  it("auto-expands primary row when search matches a sub-account", async () => {
    listMock.mockResolvedValue({
      data: {
        data: [
          {
            user_id: 1,
            first_name: "Parent",
            last_name: "User",
            phone: "9000000001",
            status: "active",
            sub_account_count: 1,
            sub_accounts: [
              {
                user_id: 2,
                first_name: "Child",
                last_name: "User",
                phone: "9000000002",
                status: "active",
                parent_id: 1,
                relationship: "child",
              },
            ],
            matched_sub_ids: [2],
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          protected_user_ids: [],
        },
      },
    });
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Sub-account")).toBeInTheDocument());
  });
});
