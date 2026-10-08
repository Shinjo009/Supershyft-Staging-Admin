import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardUserModal } from "./OnboardUserModal";
import type { PublicUserOnboardPayload } from "../../lib/api";

const listMock = vi.fn();
const getMock = vi.fn();
const publicOnboardMock = vi.fn();
const typesMock = vi.fn();
const packagesMock = vi.fn();
const defaultsMock = vi.fn();

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    usersApi: {
      ...actual.usersApi,
      list: (...args: unknown[]) => listMock(...args),
      get: (...args: unknown[]) => getMock(...args),
      publicOnboard: (...args: unknown[]) => publicOnboardMock(...args),
    },
    engagementTypesApi: {
      ...actual.engagementTypesApi,
      list: (...args: unknown[]) => typesMock(...args),
    },
    diagnosticPackagesApi: {
      ...actual.diagnosticPackagesApi,
      list: (...args: unknown[]) => packagesMock(...args),
    },
    platformSettingsApi: {
      ...actual.platformSettingsApi,
      getB2cOnboarding: (...args: unknown[]) => defaultsMock(...args),
    },
  };
});

const existingUser = {
  user_id: 42,
  first_name: "Ada",
  last_name: "Lovelace",
  age: 36,
  phone: "+91••••9999",
  email: "a•••@example.com",
  status: "active",
  is_participant: true,
};

describe("OnboardUserModal existing user", () => {
  beforeEach(() => {
    listMock.mockReset();
    getMock.mockReset();
    publicOnboardMock.mockReset();
    typesMock.mockReset();
    packagesMock.mockReset();
    defaultsMock.mockReset();

    listMock.mockResolvedValue({
      data: { data: [existingUser], meta: { page: 1, limit: 50, total: 1 } },
    });
    getMock.mockResolvedValue({ data: { data: existingUser } });
    typesMock.mockResolvedValue({
      data: {
        data: [{ id: 1, code: "bio_ai", display_name: "BioAI", is_active: true }],
      },
    });
    packagesMock.mockResolvedValue({
      data: {
        data: [{ diagnostic_package_id: 7, package_name: "Full panel", status: "active" }],
      },
    });
    defaultsMock.mockResolvedValue({
      data: {
        data: {
          defaults_by_engagement_type: {
            bio_ai: {
              assessment_package_id: 1,
              diagnostic_package_id: 7,
              blood_collection_type: null,
              create_profile_on_metsights: false,
              enroll_for_fitprint_full: false,
            },
          },
        },
      },
    });
    publicOnboardMock.mockResolvedValue({
      data: {
        data: {
          user_id: 42,
          created: false,
          is_participant: true,
          engagement_id: 9,
          engagement_code: "ENG-42",
          engagement_participant_id: 3,
        },
      },
    });
  });

  it("searches an existing user and onboards them by user id", async () => {
    render(
      <OnboardUserModal open mode="create" userId={null} onClose={() => {}} onSuccess={() => {}} />
    );

    const search = screen.getByRole("combobox");
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "Ada" } });

    const option = await screen.findByRole("button", { name: /Ada Lovelace/ }, { timeout: 3000 });
    fireEvent.click(option);

    expect(await screen.findByText(/Onboarding/)).toHaveTextContent("Ada Lovelace");
    expect(screen.getByText(/Onboarding/)).toHaveTextContent("#42");
    await screen.findByRole("option", { name: "BioAI" });
    await screen.findByRole("option", { name: /Full panel/ });
    expect(screen.queryByText("Want doctor consultation")).not.toBeInTheDocument();

    const date = document.body.querySelector('input[type="date"]');
    expect(date).toBeTruthy();
    fireEvent.change(date as HTMLInputElement, { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 09:00"), { target: { value: "09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Onboard" }));

    await waitFor(() => expect(publicOnboardMock).toHaveBeenCalledTimes(1));
    const payload = publicOnboardMock.mock.calls[0][0] as PublicUserOnboardPayload;
    expect(payload.user_id).toBe(42);
    expect(payload).not.toHaveProperty("phone");
    expect(payload).not.toHaveProperty("email");
    expect(payload.blood_collection_date).toBe("2026-10-20");
    expect(payload.blood_collection_time_slot).toBe("09:00");
    expect(payload.want_doctor_consultation).toBe(false);
    expect(payload.want_nutritionist_consultation).toBe(false);
    expect(payload.want_doctor_and_nutritionist_consultation).toBe(false);

    expect(await screen.findByText(/User onboarded successfully/)).toBeInTheDocument();
    expect(screen.getByText(/ENG-42/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith(42);
  });

  it("hides consultations for BioAI and Blood test and shows them for consultation types", async () => {
    typesMock.mockResolvedValue({
      data: {
        data: [
          { id: 1, code: "bio_ai", display_name: "BioAI", is_active: true },
          { id: 2, code: "blood_test", display_name: "Blood test", is_active: true },
          {
            id: 3,
            code: "bio_ai_with_consultation",
            display_name: "BioAI with Consultation",
            is_active: true,
          },
        ],
      },
    });

    render(
      <OnboardUserModal open mode="existing" userId={42} onClose={() => {}} onSuccess={() => {}} />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Next" }));

    const bioAiOption = await screen.findByRole("option", { name: "BioAI" });
    expect(screen.queryByText("Consultations")).not.toBeInTheDocument();
    expect(screen.queryByText("Want doctor consultation")).not.toBeInTheDocument();

    const typeSelect = bioAiOption.closest("select") as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "blood_test" } });
    expect(screen.queryByText("Want doctor consultation")).not.toBeInTheDocument();

    fireEvent.change(typeSelect, { target: { value: "bio_ai_with_consultation" } });
    expect(await screen.findByText("Consultations")).toBeInTheDocument();
    expect(screen.getByText("Want doctor consultation")).toBeInTheDocument();
    expect(screen.getByText("Want nutritionist consultation")).toBeInTheDocument();
    expect(screen.getByText("Want doctor and nutritionist consultation")).toBeInTheDocument();
  });
});
