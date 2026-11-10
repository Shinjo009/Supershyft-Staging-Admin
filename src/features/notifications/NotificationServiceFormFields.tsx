import { Modal } from "../../shared/ui/Modal";
import { DevicePreviewFrame } from "../../shared/ui/DevicePreviewFrame";
import { CHANNEL_OPTIONS, filterChipClass } from "./notificationsUiShared";
import type { ServiceFormData } from "./notificationServiceFormData";
import { useState } from "react";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500";

type Props = {
  form: ServiceFormData;
  onChange: (patch: Partial<ServiceFormData>) => void;
  readOnly?: boolean;
  serviceKeyDisabled?: boolean;
};

export function NotificationServiceFormFields({
  form,
  onChange,
  readOnly = false,
  serviceKeyDisabled = false,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const disabled = readOnly;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Service Key</label>
        <input
          type="text"
          value={form.service_key}
          onChange={(e) => onChange({ service_key: e.target.value })}
          disabled={disabled || serviceKeyDisabled}
          className={inputClass}
          placeholder="e.g. reports_email"
          required={!readOnly}
          readOnly={readOnly}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Display Name</label>
        <input
          type="text"
          value={form.display_name}
          onChange={(e) => onChange({ display_name: e.target.value })}
          disabled={disabled}
          className={inputClass}
          placeholder="e.g. Send Reports Email"
          required={!readOnly}
          readOnly={readOnly}
        />
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">Delivery</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Channel and availability for this service.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Channel</label>
          <select
            value={form.channel}
            onChange={(e) =>
              onChange({ channel: e.target.value as ServiceFormData["channel"] })
            }
            disabled={disabled}
            className={inputClass}
          >
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:opacity-60"
          />
          <span className="text-sm text-zinc-700">Active</span>
        </label>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">Content</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {form.channel === "whatsapp"
              ? "WhatsApp template configuration for this service."
              : "Email message content for this service."}
          </p>
        </div>

        {form.channel === "whatsapp" && (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Template name</label>
              <input
                type="text"
                value={form.template_name}
                onChange={(e) => onChange({ template_name: e.target.value })}
                disabled={disabled}
                className={inputClass}
                placeholder="WhatsApp template id"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Template variables (JSON)
              </label>
              <textarea
                value={form.template_variables_json}
                onChange={(e) => onChange({ template_variables_json: e.target.value })}
                disabled={disabled}
                className={`${inputClass} font-mono min-h-[120px]`}
                placeholder='{"slots": []}'
                rows={5}
                readOnly={readOnly}
              />
            </div>
          </>
        )}

        {form.channel === "email" && (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email subject</label>
              <input
                type="text"
                value={form.email_subject}
                onChange={(e) => onChange({ email_subject: e.target.value })}
                disabled={disabled}
                className={inputClass}
                readOnly={readOnly}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ email_body_mode: "plain" })}
                className={filterChipClass(form.email_body_mode === "plain")}
              >
                Plain text
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ email_body_mode: "html" })}
                className={filterChipClass(form.email_body_mode === "html")}
              >
                HTML
              </button>
            </div>
            {form.email_body_mode === "plain" ? (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email body</label>
                <textarea
                  value={form.email_body}
                  onChange={(e) => onChange({ email_body: e.target.value })}
                  disabled={disabled}
                  className={`${inputClass} min-h-[140px]`}
                  rows={6}
                  readOnly={readOnly}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">Email body (HTML)</label>
                <textarea
                  value={form.email_html}
                  onChange={(e) => onChange({ email_html: e.target.value })}
                  disabled={disabled}
                  className={`${inputClass} font-mono min-h-[160px]`}
                  rows={8}
                  readOnly={readOnly}
                />
                {form.email_html.trim() ? (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="text-sm text-zinc-700 underline hover:text-zinc-900"
                  >
                    Preview HTML
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Email HTML preview"
        maxWidthClassName="max-w-5xl"
      >
        <div className="flex flex-col" style={{ minHeight: "28rem" }}>
          <p className="text-sm font-medium text-zinc-900 mb-3 px-1">
            {form.email_subject.trim() || "(no subject)"}
          </p>
          <DevicePreviewFrame className="min-h-[24rem]">
            <div
              className="prose prose-sm max-w-none p-4 text-zinc-900"
              dangerouslySetInnerHTML={{
                __html: form.email_html.trim() || "<p>(empty)</p>",
              }}
            />
          </DevicePreviewFrame>
        </div>
      </Modal>
    </>
  );
}
