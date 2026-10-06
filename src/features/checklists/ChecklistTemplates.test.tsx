import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChecklistTemplates } from "./ChecklistTemplates";

const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("../../contexts/PermissionContext", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePermissions: () => ({
    canEditTask: () => true,
  }),
}));

vi.mock("../../lib/api", () => ({
  getApiError: (err: unknown) => String(err),
  checklistTemplatesApi: {
    list: (...args: unknown[]) => mockList(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe("ChecklistTemplates", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockGet.mockReset();
    mockList.mockResolvedValue({
      data: {
        data: [
          {
            template_id: 1,
            name: "T1",
            status: "active",
            created_at: "2026-01-01T00:00:00Z",
            items_count: 3,
          },
          {
            template_id: 2,
            name: "T2",
            status: "active",
            created_at: "2026-01-02T00:00:00Z",
            items_count: 0,
          },
        ],
      },
    });
  });

  it("loads list once without fetching each template for item counts", async () => {
    render(
      <MemoryRouter>
        <ChecklistTemplates />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });
    expect(mockGet).not.toHaveBeenCalled();
  });
});
