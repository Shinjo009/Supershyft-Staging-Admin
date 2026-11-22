import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "./Login";

const mockNavigate = vi.fn();
const mockDiscoverEligibleRoles = vi.fn();
const mockSendOtp = vi.fn();
const mockResendOtp = vi.fn();
const mockLogin = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    discoverEligibleRoles: mockDiscoverEligibleRoles,
    sendOtp: mockSendOtp,
    resendOtp: mockResendOtp,
    isAuthenticated: false,
    isLoading: false,
    employeeRole: null,
    authKind: null,
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    error: null,
    clearError: vi.fn(),
  }),
}));

const employeeSelection = {
  authKind: "employee" as const,
  label: "Employee",
};

describe("Login", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockNavigate.mockReset();
    mockDiscoverEligibleRoles.mockReset();
    mockSendOtp.mockReset();
    mockResendOtp.mockReset();
    mockLogin.mockReset();
    mockDiscoverEligibleRoles.mockResolvedValue([
      { kind: "employee", role: "employee", label: "Employee" },
    ]);
    mockSendOtp.mockResolvedValue({ session_id: 1 });
    mockResendOtp.mockResolvedValue({ session_id: 2 });
    mockLogin.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function goToOtpViaSingleRole(phone = "9876543210") {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: phone },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mockDiscoverEligibleRoles).toHaveBeenCalledWith("9876543210");
      expect(mockSendOtp).toHaveBeenCalledWith("9876543210", employeeSelection);
      expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
    });
  }

  it("skips role selection when only one eligible role exists", async () => {
    await goToOtpViaSingleRole();
    expect(screen.queryByRole("button", { name: "Employee" })).not.toBeInTheDocument();
  });

  it("shows only matching roles when several are eligible", async () => {
    mockDiscoverEligibleRoles.mockResolvedValue([
      { kind: "employee", role: "employee", label: "Employee" },
      { kind: "partner", role: "author", label: "Author" },
    ]);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Employee" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Author" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Partner" })).not.toBeInTheDocument();
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("shows empty state when no eligible roles", async () => {
    mockDiscoverEligibleRoles.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText(/No eligible account/i)).toBeInTheDocument();
    });
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("keeps resend unavailable during the cooldown", async () => {
    await goToOtpViaSingleRole();

    expect(screen.getByText(/Resend OTP in 30s/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend OTP" })).not.toBeInTheDocument();
  });

  it("shows resend after 30 seconds and sends with the selection", async () => {
    await goToOtpViaSingleRole();

    vi.advanceTimersByTime(30_000);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resend OTP" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Resend OTP" }));

    await waitFor(() => {
      expect(mockResendOtp).toHaveBeenCalledWith("9876543210", employeeSelection);
      expect(mockResendOtp).toHaveBeenCalledTimes(1);
    });
  });

  it("verifies OTP with the selected role", async () => {
    await goToOtpViaSingleRole();

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify & Sign in" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "9876543210",
        "654321",
        employeeSelection
      );
    });
  });
});
