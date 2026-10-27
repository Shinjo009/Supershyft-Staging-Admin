import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import {
  diagnosticFilterChipsApi,
  getApiError,
  type DiagnosticFilterChip,
  type DiagnosticFilterChipFor,
} from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionContext";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";

interface DiagnosticFilterChipsProps {
  embedded?: boolean;
}

type ChipModalMode = "add" | "edit";

const LIST_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_FORM = {
  display_name: "",
  chip_key: "",
  display_order: "",
  chip_for: "public_package" as DiagnosticFilterChipFor,
};

export function DiagnosticFilterChips({ embedded = false }: DiagnosticFilterChipsProps) {
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("diagnostics", "filter_chips");
  const [chipScope, setChipScope] = useState<DiagnosticFilterChipFor>("public_package");
  const [chips, setChips] = useState<DiagnosticFilterChip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ChipModalMode>("add");
  const [editingChip, setEditingChip] = useState<DiagnosticFilterChip | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticFilterChipsApi.list(chipScope, {
        page,
        limit: LIST_LIMIT,
        search: debouncedSearch || undefined,
        include_inactive: true,
      });
      setChips(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [chipScope, page, debouncedSearch]);

  useEffect(() => {
    void fetchChips();
  }, [fetchChips]);

  useEffect(() => {
    setPage(1);
  }, [chipScope, debouncedSearch]);

  const openAdd = () => {
    setModalMode("add");
    setEditingChip(null);
    setFormData({ ...EMPTY_FORM, chip_for: chipScope });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: DiagnosticFilterChip) => {
    setModalMode("edit");
    setEditingChip(row);
    const cf = (row.chip_for as DiagnosticFilterChipFor) || "public_package";
    setFormData({
      display_name: row.display_name ?? "",
      chip_key: row.chip_key ?? "",
      display_order: row.display_order != null ? String(row.display_order) : "",
      chip_for: cf === "custom_package" ? "custom_package" : "public_package",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.display_name.trim() || !formData.chip_key.trim()) {
      setFormError("Display name and chip key are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        display_name: formData.display_name.trim(),
        chip_key: formData.chip_key.trim(),
        display_order: formData.display_order ? Number(formData.display_order) : undefined,
        chip_for: formData.chip_for,
      };
      if (modalMode === "add") {
        await diagnosticFilterChipsApi.create({ ...payload, chip_for: chipScope });
      } else if (editingChip) {
        await diagnosticFilterChipsApi.update(editingChip.filter_chip_id, payload);
      }
      setModalOpen(false);
      await fetchChips();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (row: DiagnosticFilterChip) => {
    setDeletingId(row.filter_chip_id);
  };

  const confirmDelete = async () => {
    if (deletingId == null) return;
    const id = deletingId;
    try {
      await diagnosticFilterChipsApi.delete(id);
      setDeletingId(null);
      await fetchChips();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<DiagnosticFilterChip>[] = [
    { key: "display_name", label: "Display name", sortable: true },
    { key: "chip_key", label: "Chip key", sortable: true },
    { key: "display_order", label: "Order", sortable: true },
    {
      key: "chip_for",
      label: "Scope",
      render: (row) => (
        <span className="text-xs text-zinc-600">{(row.chip_for as string) || "public_package"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            (row.status ?? "").toLowerCase() === "active"
              ? "bg-green-50 text-green-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {(row.status ?? "inactive").toLowerCase() === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex gap-4">
      <aside className="w-44 shrink-0 border border-zinc-200 rounded-xl bg-white p-2 space-y-1 self-start">
        <p className="text-xs font-medium text-zinc-500 px-2 py-1">Package chips</p>
        <button
          type="button"
          onClick={() => {
            setChipScope("public_package");
            setPage(1);
          }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
            chipScope === "public_package" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          Public packages
        </button>
        <button
          type="button"
          onClick={() => {
            setChipScope("custom_package");
            setPage(1);
          }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
            chipScope === "custom_package" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          Custom packages
        </button>
      </aside>
      <div className="min-w-0 flex-1">
      <PageHeaderActions>
        {mayEdit && (
          <HeaderActionButton label="Add filter chip" icon={Plus} onClick={openAdd} />
        )}
      </PageHeaderActions>
      {!embedded && (
        <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 mb-6">Diagnostics filter chips</h1>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900"
            placeholder="Search filter chips..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={chips}
            keyExtractor={(row) => row.filter_chip_id}
            onEdit={mayEdit ? openEdit : undefined}
            onDelete={mayEdit ? openDeleteConfirm : undefined}
            pagination={{
              page,
              limit: LIST_LIMIT,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "add" ? "Add filter chip" : "Edit filter chip"}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Display name</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Chip key</label>
            <input
              type="text"
              value={formData.chip_key}
              onChange={(e) => setFormData((prev) => ({ ...prev, chip_key: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_order: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          {modalMode === "edit" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Scope</label>
              <select
                value={formData.chip_for}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, chip_for: e.target.value as DiagnosticFilterChipFor }))
                }
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
              >
                <option value="public_package">Public packages</option>
                <option value="custom_package">Custom packages</option>
              </select>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving..." : modalMode === "add" ? "Create filter chip" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {deletingId != null && (
        <Modal open={deletingId != null} onClose={() => setDeletingId(null)} title="Delete filter chip">
          <p className="text-sm text-zinc-600 mb-4">This action cannot be undone.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
