import { render, waitFor } from "@testing-library/react";
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
});
