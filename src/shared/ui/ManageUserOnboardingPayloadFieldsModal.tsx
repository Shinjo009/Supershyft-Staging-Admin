import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { usePermissions } from "../../contexts/PermissionContext";
import { fetchAllPages } from "../../lib/fetchAllPages";
import {
  getApiError,
  userOnboardingPayloadFieldsApi,
  type UserOnboardingPayloadFieldItem,
  type UserOnboardingPayloadInputType,
  type UserOnboardingPayloadSection,
} from "../../lib/api";

interface ManageUserOnboardingPayloadFieldsModalProps {
  open: boolean;
  onClose: () => void;
}

type FormMode = "add" | "edit";

const SECTION_OPTIONS: { value: UserOnboardingPayloadSection; label: string }[] = [
  { value: "personal_information", label: "Personal information" },
  { value: "address", label: "Address" },
  { value: "schedule", label: "Schedule" },
];

const INPUT_TYPE_OPTIONS: { value: UserOnboardingPayloadInputType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
  { value: "json", label: "JSON" },
];

const EMPTY_FORM = {
  payload_key: "",
  display_name: "",
  section: "personal_information" as UserOnboardingPayloadSection,
  input_type: "text" as UserOnboardingPayloadInputType,
};

export function ManageUserOnboardingPayloadFieldsModal({
  open,
  onClose,
}: ManageUserOnboardingPayloadFieldsModalProps) {
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("organizations", "onboarding_payload_fields");
  const [fields, setFields] = useState<UserOnboardingPayloadFieldItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [editing, setEditing] = useState<UserOnboardingPayloadFieldItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingField, setDeletingField] = useState<UserOnboardingPayloadFieldItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!mayEdit) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllPages<UserOnboardingPayloadFieldItem>((page, limit) =>
        userOnboardingPayloadFieldsApi.list({ page, limit })
      );
      setFields(rows);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [mayEdit]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFormOpen(false);
    setDeletingField(null);
    void fetchFields();
  }, [open, fetchFields]);

  const filtered = useMemo(() => {
    if (!search.trim()) return fields;
    const q = search.trim().toLowerCase();
    return fields.filter(
      (row) =>
        row.payload_key.toLowerCase().includes(q) ||
        (row.display_name ?? "").toLowerCase().includes(q) ||
        row.section.toLowerCase().includes(q) ||
        row.input_type.toLowerCase().includes(q)
    );
  }, [fields, search]);

  const openAdd = () => {
    setFormMode("add");
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: UserOnboardingPayloadFieldItem) => {
    setFormMode("edit");
    setEditing(row);
    setFormData({
      payload_key: row.payload_key,
      display_name: row.display_name ?? "",
      section: row.section,
      input_type: row.input_type,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      payload_key: formData.payload_key.trim(),
      display_name: formData.display_name.trim() || null,
      section: formData.section,
      input_type: formData.input_type,
    };
    if (!payload.payload_key) {
      setFormError("Payload key is required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (formMode === "add") {
        await userOnboardingPayloadFieldsApi.create(payload);
      } else if (editing) {
        await userOnboardingPayloadFieldsApi.update(editing.id, payload);
      }
      setFormOpen(false);
      await fetchFields();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingField) return;
    setDeleting(true);
    try {
      await userOnboardingPayloadFieldsApi.delete(deletingField.id);
      setDeletingField(null);
      await fetchFields();
    } catch (err) {
      setError(getApiError(err));
      setDeletingField(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!mayEdit) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage User Onboarding Payload Fields" maxWidthClassName="max-w-3xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Add field
            </button>
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Key</th>
                    <th className="text-left px-3 py-2 font-medium">Display name</th>
                    <th className="text-left px-3 py-2 font-medium">Section</th>
                    <th className="text-left px-3 py-2 font-medium">Input type</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                        No fields found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                        <td className="px-3 py-2 font-mono text-xs">{row.payload_key}</td>
                        <td className="px-3 py-2">{row.display_name || "—"}</td>
                        <td className="px-3 py-2">{row.section}</td>
                        <td className="px-3 py-2">{row.input_type}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex p-1.5 rounded hover:bg-zinc-200 text-zinc-600"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingField(row)}
                            className="inline-flex p-1.5 rounded hover:bg-red-100 text-red-600 ml-1"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={formMode === "add" ? "Add payload field" : "Edit payload field"}
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-zinc-500">Payload key</span>
            <input
              value={formData.payload_key}
              onChange={(e) => setFormData((d) => ({ ...d, payload_key: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
              disabled={submitting}
            />
          </label>
          <label className="block">
            <span className="text-zinc-500">Display name</span>
            <input
              value={formData.display_name}
              onChange={(e) => setFormData((d) => ({ ...d, display_name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              disabled={submitting}
            />
          </label>
          <label className="block">
            <span className="text-zinc-500">Section</span>
            <select
              value={formData.section}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  section: e.target.value as UserOnboardingPayloadSection,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              disabled={submitting}
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-zinc-500">Input type</span>
            <select
              value={formData.input_type}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  input_type: e.target.value as UserOnboardingPayloadInputType,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              disabled={submitting}
            >
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="px-3 py-2 rounded-lg border border-zinc-300 text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="px-3 py-2 rounded-lg bg-zinc-900 text-white font-medium"
            >
              {submitting ? "Saving…" : formMode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deletingField}
        onClose={() => !deleting && setDeletingField(null)}
        title="Delete payload field"
        maxWidthClassName="max-w-md"
      >
        <p className="text-sm text-zinc-600 mb-4">
          Delete field <span className="font-medium">{deletingField?.payload_key}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeletingField(null)}
            disabled={deleting}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={deleting}
            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}
