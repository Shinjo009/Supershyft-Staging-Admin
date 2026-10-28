import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import {
  diagnosticPackagesApi,
  expertTypesApi,
  getApiError,
  uploadsApi,
  type DiagnosticPackageDetail,
  type ExpertTypeItem,
} from "../../lib/api";
import { DiagnosticPackageFormFields } from "./DiagnosticPackageFormFields";
import {
  buildPackagePayload,
  detailToForm,
  EMPTY_PACKAGE_FORM,
  listItemToForm,
  validatePackageForm,
  type PackageFormState,
} from "./diagnosticPackageFormData";
import { PackageProviderSwitcher } from "./PackageProviderSwitcher";

type FormPageMode = "add" | "edit";

function parsePackageId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseJoinDefaultId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function DiagnosticPackageFormPage({ mode }: { mode: FormPageMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { packageId: packageIdParam } = useParams<{ packageId: string }>();
  const packageId = mode === "edit" ? parsePackageId(packageIdParam) : null;
  const joinDefaultId = mode === "add" ? parseJoinDefaultId(searchParams.get("join_default_id")) : null;

  const [loading, setLoading] = useState(mode === "edit" || joinDefaultId != null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PackageFormState>(() => {
    if (joinDefaultId) {
      return {
        ...EMPTY_PACKAGE_FORM,
        linkMode: "linked",
        same_as_package_id: joinDefaultId,
      };
    }
    return { ...EMPTY_PACKAGE_FORM };
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [expertTypes, setExpertTypes] = useState<ExpertTypeItem[]>([]);
  const [packageName, setPackageName] = useState("");
  const [joinParentName, setJoinParentName] = useState<string | null>(null);
  const [editDetail, setEditDetail] = useState<DiagnosticPackageDetail | null>(null);
  const [formDirty, setFormDirty] = useState(false);

  const backTo = useMemo(() => {
    if (mode === "add" && joinDefaultId) return `/diagnostics/packages/${joinDefaultId}`;
    if (mode === "edit" && packageId) return `/diagnostics/packages/${packageId}`;
    return "/diagnostics/packages";
  }, [mode, packageId, joinDefaultId]);

  const headerConfig = useMemo(() => {
    if (mode === "add" && joinDefaultId) {
      return {
        title: "Add package",
        subtitle: joinParentName ? `Same group as ${joinParentName}` : "Same package group as existing package",
        backTo,
      };
    }
    if (mode === "add") {
      return {
        title: "New diagnostic package",
        subtitle: "Create public package",
        backTo: "/diagnostics/packages",
      };
    }
    return {
      title: packageName ? `Edit · ${packageName}` : "Edit package",
      subtitle: packageId ? `Package #${packageId}` : undefined,
      backTo,
    };
  }, [mode, packageName, packageId, backTo, joinDefaultId, joinParentName]);

  usePageHeader(headerConfig);

  const loadBootstrap = useCallback(async () => {
    try {
      const typesRes = await expertTypesApi.list();
      setExpertTypes(typesRes.data.data ?? []);
    } catch {
      /* optional */
    }
  }, []);

  const loadJoinParent = useCallback(async () => {
    if (!joinDefaultId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticPackagesApi.get(joinDefaultId);
      const parent = res.data.data;
      setJoinParentName(parent.package_name);
      setForm((prev) => ({
        ...prev,
        linkMode: "linked",
        same_as_package_id: joinDefaultId,
        package_for: (parent.package_for as "public" | "camp") ?? prev.package_for,
      }));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [joinDefaultId]);

  const loadForEdit = useCallback(async () => {
    if (!packageId) return;
    setLoading(true);
    setError(null);
    try {
      const detailRes = await diagnosticPackagesApi.get(packageId);
      const detail = detailRes.data.data;
      setEditDetail(detail);
      setFormDirty(false);
      setPackageName(detail.package_name);
      const base = listItemToForm(detail);
      setForm(detailToForm(detail, base));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (mode === "add" && joinDefaultId) void loadJoinParent();
  }, [mode, joinDefaultId, loadJoinParent]);

  useEffect(() => {
    if (mode === "edit") void loadForEdit();
  }, [mode, loadForEdit]);

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    setImageUploading(true);
    setFormError(null);
    try {
      const res = await uploadsApi.uploadPackageImage(file);
      setForm((prev) => ({ ...prev, package_image: res.data.data.url }));
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    const validation = validatePackageForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = buildPackagePayload(form);
      if (mode === "add") {
        if (form.linkMode === "linked" && form.same_as_package_id) {
          payload.same_as_package_id = form.same_as_package_id;
        }
        const res = await diagnosticPackagesApi.create(payload);
        const id = res.data.data.diagnostic_package_id;
        navigate(`/diagnostics/packages/${id}`);
        return;
      }
      if (!packageId) return;
      await diagnosticPackagesApi.update(packageId, payload);
      navigate(`/diagnostics/packages/${packageId}`);
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "edit" && !packageId) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid package id.{" "}
        <Link to="/diagnostics/packages" className="underline">Back to list</Link>
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
      {mode === "edit" && packageId && editDetail ? (
        <PackageProviderSwitcher
          currentPackageId={packageId}
          detail={editDetail}
          mode="edit"
          isDirty={formDirty}
          onSetDefaultComplete={() => void loadForEdit()}
          labCount={1 + (editDetail.same_packages?.length ?? 0)}
        />
      ) : null}
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
        {mode === "add" && joinDefaultId && joinParentName ? (
          <p className="text-sm text-zinc-700 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            This new package will use the same package group as{" "}
            <span className="font-medium text-zinc-900">{joinParentName}</span>.
          </p>
        ) : null}
        <DiagnosticPackageFormFields
          form={form}
          setForm={(value) => {
            setFormDirty(true);
            setForm(value);
          }}
          expertTypes={expertTypes}
          imageUploading={imageUploading}
          onImageUpload={handleImageUpload}
        />
        <div className="sticky bottom-0 z-10 -mx-1 px-1 py-3 bg-zinc-50/95 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : mode === "add" ? "Create package" : "Save changes"}
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
