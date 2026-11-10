import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Pencil } from "lucide-react";
import {
  HeaderActionButton,
  PageHeaderActions,
  usePageHeader,
} from "../../layouts/PageHeaderActions";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { notificationsApi, type NotificationServiceItem, getApiError } from "../../lib/api";
import { formatDateTime } from "./notificationsUiShared";
import { NotificationServiceFormFields } from "./NotificationServiceFormFields";
import {
  EMPTY_SERVICE_FORM,
  buildContentFields,
  hiddenServiceDefaults,
  itemToForm,
  type ServiceFormData,
} from "./notificationServiceFormData";

export type NotificationServiceFormMode = "add" | "edit" | "view";

function parseServiceId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function NotificationServiceFormPage({ mode }: { mode: NotificationServiceFormMode }) {
  const navigate = useNavigate();
  const { serviceId: serviceIdParam } = useParams<{ serviceId?: string }>();
  const serviceId = mode === "add" ? null : parseServiceId(serviceIdParam);
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "services");

  const [loading, setLoading] = useState(mode !== "add");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_SERVICE_FORM);
  const [loadedRow, setLoadedRow] = useState<NotificationServiceItem | null>(null);

  const listPath = "/notifications/services";

  usePageHeader({
    title:
      mode === "add"
        ? "Add notification service"
        : mode === "edit"
          ? "Edit notification service"
          : loadedRow?.display_name ?? "Notification service",
    subtitle: loadedRow?.service_key ?? (mode === "add" ? "Create a new service" : undefined),
    backTo: listPath,
  });

  const loadService = useCallback(async () => {
    if (serviceId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.listServices();
      const row = res.data.data.find((s) => s.notification_service_id === serviceId);
      if (!row) throw new Error("Service not found");
      setLoadedRow(row);
      setForm(itemToForm(row));
    } catch (err) {
      setError(getApiError(err));
      setLoadedRow(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (mode === "add") {
      setForm(EMPTY_SERVICE_FORM);
      setLoadedRow(null);
      setLoading(false);
      return;
    }
    void loadService();
  }, [loadService, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "view" || !mayEdit) return;
    setSubmitting(true);
    setError(null);
    try {
      const contentFields = buildContentFields(form);
      if (mode === "add") {
        const hidden = hiddenServiceDefaults(form.service_key);
        await notificationsApi.createService({
          service_key: form.service_key.trim(),
          display_name: form.display_name.trim(),
          channel: form.channel,
          is_active: form.is_active,
          ...hidden,
          ...contentFields,
        });
      } else if (serviceId != null && loadedRow) {
        const hidden = hiddenServiceDefaults(form.service_key, loadedRow);
        await notificationsApi.updateService(serviceId, {
          display_name: form.display_name.trim(),
          channel: form.channel,
          is_active: form.is_active,
          webhook_path: hidden.webhook_path,
          require_blood_report_url: hidden.require_blood_report_url,
          require_bio_ai_report_url: hidden.require_bio_ai_report_url,
          require_participant_detail: hidden.require_participant_detail,
          require_otp: hidden.require_otp,
          require_session_details: hidden.require_session_details,
          require_external_link: hidden.require_external_link,
          ...contentFields,
        });
      }
      navigate(listPath);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode !== "add" && serviceId == null) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid service.{" "}
        <Link to={listPath} className="text-zinc-900 underline">
          Back to services
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const readOnly = mode === "view" || !mayEdit;

  return (
    <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto">
      {mode === "view" && mayEdit && serviceId != null ? (
        <PageHeaderActions>
          <HeaderActionButton
            label="Edit"
            icon={Pencil}
            onClick={() => navigate(`/notifications/services/${serviceId}/edit`)}
          />
        </PageHeaderActions>
      ) : null}

      <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <NotificationServiceFormFields
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            readOnly={readOnly}
            serviceKeyDisabled={mode !== "add"}
          />

          {loadedRow?.created_at ? (
            <p className="text-xs text-zinc-500">Created {formatDateTime(loadedRow.created_at)}</p>
          ) : null}

          {!readOnly ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-100">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? "Saving…" : mode === "add" ? "Create service" : "Update service"}
              </button>
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-zinc-100">
              <PermissionGate category="notifications" taskKey="services" action="edit">
                <button
                  type="button"
                  onClick={() => serviceId && navigate(`/notifications/services/${serviceId}/edit`)}
                  className="text-sm text-zinc-700 underline"
                >
                  Edit this service
                </button>
              </PermissionGate>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
