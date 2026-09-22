import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ExportSelectedParticipantsDialog,
  isExportReasonValid,
  logThenDownloadParticipantsExport,
} from "./ExportSelectedParticipantsDialog";

describe("isExportReasonValid", () => {
  it("requires at least three non-space characters", () => {
    expect(isExportReasonValid("")).toBe(false);
    expect(isExportReasonValid("  ")).toBe(false);
    expect(isExportReasonValid("ab")).toBe(false);
    expect(isExportReasonValid("  yes  ")).toBe(true);
  });
});

describe("ExportSelectedParticipantsDialog", () => {
  const baseProps = {
    open: true,
    selectedCount: 3,
    format: "csv" as const,
    withAddress: false,
    reason: "",
    onFormatChange: vi.fn(),
    onWithAddressChange: vi.fn(),
    onReasonChange: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it("keeps export disabled until a reason is entered", () => {
    render(<ExportSelectedParticipantsDialog {...baseProps} />);
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm after a reason is provided", () => {
    const onConfirm = vi.fn();
    render(
      <ExportSelectedParticipantsDialog
        {...baseProps}
        reason="Need camp sheet"
        onConfirm={onConfirm}
      />
    );
    const exportButton = screen.getByRole("button", { name: "Export" });
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("logThenDownloadParticipantsExport", () => {
  const payload = {
    export_type: "participants" as const,
    export_format: "csv" as const,
    source_kind: "engagement" as const,
    source_id: "42",
    row_count: 3,
  };

  it("does not POST or download without a reason", async () => {
    const createLog = vi.fn();
    const download = vi.fn();
    const logged = await logThenDownloadParticipantsExport({
      reason: "  ",
      payload,
      createLog,
      download,
    });
    expect(logged).toBe(false);
    expect(createLog).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it("calls POST then downloads when a reason is provided", async () => {
    const createLog = vi.fn().mockResolvedValue({ data: { export_log_id: 9 } });
    const download = vi.fn();
    const logged = await logThenDownloadParticipantsExport({
      reason: "  Need camp sheet  ",
      payload,
      createLog,
      download,
    });
    expect(logged).toBe(true);
    expect(createLog).toHaveBeenCalledTimes(1);
    expect(createLog).toHaveBeenCalledWith({
      ...payload,
      reason: "Need camp sheet",
    });
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("does not download if the log POST fails", async () => {
    const createLog = vi.fn().mockRejectedValue(new Error("log failed"));
    const download = vi.fn();
    await expect(
      logThenDownloadParticipantsExport({
        reason: "Need camp sheet",
        payload,
        createLog,
        download,
      })
    ).rejects.toThrow("log failed");
    expect(createLog).toHaveBeenCalledTimes(1);
    expect(download).not.toHaveBeenCalled();
  });
});
