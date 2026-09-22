import { Download, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import type { ExportLogCreatePayload } from "../../lib/api";

export type ParticipantsExportFormat = "csv" | "excel";

export function isExportReasonValid(reason: string): boolean {
  return reason.trim().length >= 3;
}

export async function logThenDownloadParticipantsExport(args: {
  reason: string;
  payload: Omit<ExportLogCreatePayload, "reason">;
  createLog: (payload: ExportLogCreatePayload) => Promise<unknown>;
  download: () => void;
}): Promise<boolean> {
  const reason = args.reason.trim();
  if (!isExportReasonValid(reason)) {
    return false;
  }
  await args.createLog({ ...args.payload, reason });
  args.download();
  return true;
}

interface ExportSelectedParticipantsDialogProps {
  open: boolean;
  selectedCount: number;
  format: ParticipantsExportFormat;
  withAddress: boolean;
  reason: string;
  submitting?: boolean;
  error?: string | null;
  onFormatChange: (format: ParticipantsExportFormat) => void;
  onWithAddressChange: (value: boolean) => void;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const selectClass =
  "px-2 py-1.5 text-xs rounded-lg border border-zinc-300 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900";

export function ExportSelectedParticipantsDialog({
  open,
  selectedCount,
  format,
  withAddress,
  reason,
  submitting = false,
  error = null,
  onFormatChange,
  onWithAddressChange,
  onReasonChange,
  onCancel,
  onConfirm,
}: ExportSelectedParticipantsDialogProps) {
  const canConfirm = isExportReasonValid(reason) && !submitting;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Export selected participants"
      maxWidthClassName="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">
          Export{" "}
          <span className="font-semibold">{selectedCount}</span> selected participant
          {selectedCount !== 1 ? "s" : ""} in the format below.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-format" className="text-xs font-medium text-zinc-500">
            Format
          </label>
          <select
            id="export-format"
            value={format}
            onChange={(e) => onFormatChange(e.target.value as ParticipantsExportFormat)}
            className={selectClass}
            disabled={submitting}
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </div>
        <label
          htmlFor="export-with-address"
          className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer"
        >
          <input
            id="export-with-address"
            type="checkbox"
            checked={withAddress}
            onChange={(e) => onWithAddressChange(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            disabled={submitting}
          />
          with-address
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-reason" className="text-xs font-medium text-zinc-500">
            Reason for export
          </label>
          <textarea
            id="export-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why are you exporting this data?"
            disabled={submitting}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-y min-h-[5rem]"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>
    </Modal>
  );
}
