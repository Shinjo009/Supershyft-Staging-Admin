import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import { diagnosticTestGroupsApi, getApiError } from "../../lib/api";
import { DiagnosticTestGroupFormFields } from "./DiagnosticTestGroupFormFields";
import {
  buildTestGroupPayload,
  EMPTY_TEST_GROUP_FORM,
  testGroupToForm,
  type TestGroupFormState,
} from "./diagnosticTestGroupFormData";

type FormPageMode = "add" | "edit";

const LIST_BACK = "/diagnostics/packages?tab=test-groups";

function parseGroupId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function DiagnosticTestGroupFormPage({ mode }: { mode: FormPageMode }) {
  const navigate = useNavigate();
  const { groupId: groupIdParam } = useParams<{ groupId: string }>();
  const groupId = mode === "edit" ? parseGroupId(groupIdParam) : null;

  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TestGroupFormState>({ ...EMPTY_TEST_GROUP_FORM });
  const [groupKeyManuallyEdited, setGroupKeyManuallyEdited] = useState(mode === "edit");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [groupName, setGroupName] = useState("");

  const backTo = useMemo(() => {
    if (mode === "edit" && groupId) return `/diagnostics/test-groups/${groupId}`;
    return LIST_BACK;
  }, [mode, groupId]);

  const headerConfig = useMemo(() => {
    if (mode === "add") {
      return { title: "New test group", subtitle: "Create catalog test group", backTo: LIST_BACK };
    }
    return {
      title: groupName ? `Edit · ${groupName}` : "Edit test group",
      subtitle: groupId ? `Group #${groupId}` : undefined,
      backTo,
    };
  }, [mode, groupName, groupId, backTo]);

  usePageHeader(headerConfig);

  const loadForEdit = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticTestGroupsApi.get(groupId);
      const detail = res.data.data;
      setGroupName(detail.group_name);
      setForm(testGroupToForm(detail));
      setGroupKeyManuallyEdited(true);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (mode === "edit") void loadForEdit();
  }, [mode, loadForEdit]);

  useEffect(() => {
    if (!groupId || mode !== "edit") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await diagnosticTestGroupsApi.getTests(groupId);
        const tests = res.data.data ?? [];
        let sum = 0;
        for (const t of tests) {
          if (t.original_price != null && Number.isFinite(t.original_price)) sum += t.original_price;
        }
        if (!cancelled && sum > 0) {
          setForm((f) => ({ ...f, original_price: String(sum) }));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, mode]);

  const handleSubmit = async () => {
    if (!form.group_name.trim()) {
      setFormError("Group name is required.");
      return;
    }
    const payload = buildTestGroupPayload(form);
    if (!payload.group_key) {
      setFormError("Group key is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (mode === "add") {
        const res = await diagnosticTestGroupsApi.create(payload);
        const id = res.data.data.group_id;
        navigate(`/diagnostics/test-groups/${id}`);
        return;
      }
      if (!groupId) return;
      await diagnosticTestGroupsApi.update(groupId, payload);
      navigate(`/diagnostics/test-groups/${groupId}`);
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "edit" && !groupId) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid group id.{" "}
        <Link to={LIST_BACK} className="underline">Back to list</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-700">
        {error}{" "}
        <Link to={backTo} className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full min-w-0 pb-24">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="space-y-4"
      >
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
        )}
        <DiagnosticTestGroupFormFields
          form={form}
          setForm={setForm}
          groupKeyManuallyEdited={groupKeyManuallyEdited}
          setGroupKeyManuallyEdited={setGroupKeyManuallyEdited}
        />
        <div className="sticky bottom-0 z-10 -mx-1 px-1 py-3 bg-zinc-50/95 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : mode === "add" ? "Create test group" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
