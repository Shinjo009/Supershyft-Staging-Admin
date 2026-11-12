import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { OperationsTable, type OperationsColumn, type RowTooltipParts } from "./OperationsTable";

const PAGE_SIZE = 25;

export function OperationsViewAllModal<T>({
  open,
  onClose,
  title,
  rows,
  columns,
  rowKey,
  onRowClick,
  rowTooltip,
  matchesSearch,
  searchPlaceholder,
  itemNoun,
  emptyMessage = "No matching results.",
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: T[];
  columns: OperationsColumn<T>[];
  rowKey: (row: T) => string | number;
  onRowClick: (row: T) => void;
  rowTooltip?: (row: T) => RowTooltipParts;
  matchesSearch: (row: T, query: string) => boolean;
  searchPlaceholder: string;
  /** Plural noun for the count label, e.g. "participants". */
  itemNoun: string;
  emptyMessage?: string;
  headerExtra?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [search, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => matchesSearch(row, q));
  }, [rows, search, matchesSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-4xl">
      <div className="flex flex-col h-[70vh] min-h-[70vh]">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:max-w-sm px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-500 sm:ml-auto">
            {filtered.length === rows.length
              ? `${rows.length.toLocaleString()} ${itemNoun}`
              : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} ${itemNoun}`}
          </p>
        </div>
        {headerExtra ? <div className="shrink-0 flex flex-wrap gap-1.5 mb-3">{headerExtra}</div> : null}

        <div className="flex-1 min-h-0 overflow-auto border border-zinc-100 rounded-lg">
          {pageRows.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">{emptyMessage}</p>
          ) : (
            <OperationsTable
              columns={columns}
              rows={pageRows}
              rowKey={rowKey}
              onRowClick={onRowClick}
              rowTooltip={rowTooltip}
            />
          )}
        </div>

        <div className="shrink-0 mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {filtered.length === 0 ? "Showing 0" : `Showing ${from}–${to} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 disabled:opacity-40 hover:bg-zinc-50"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 disabled:opacity-40 hover:bg-zinc-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
