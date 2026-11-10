import type { NotificationServiceItem } from "../../lib/api";
import {
  parseTemplateVariablesJson,
  stringifyTemplateVariables,
} from "./notificationsUiShared";

export type EmailBodyMode = "plain" | "html";

export interface ServiceFormData {
  service_key: string;
  display_name: string;
  channel: "email" | "whatsapp";
  is_active: boolean;
  template_name: string;
  template_variables_json: string;
  email_subject: string;
  email_body: string;
  email_html: string;
  email_body_mode: EmailBodyMode;
}

export const EMPTY_SERVICE_FORM: ServiceFormData = {
  service_key: "",
  display_name: "",
  channel: "email",
  is_active: true,
  template_name: "",
  template_variables_json: "",
  email_subject: "",
  email_body: "",
  email_html: "",
  email_body_mode: "plain",
};

export function itemToForm(row: NotificationServiceItem): ServiceFormData {
  const hasHtml = Boolean(row.email_html?.trim());
  return {
    service_key: row.service_key,
    display_name: row.display_name,
    channel: row.channel,
    is_active: row.is_active,
    template_name: row.template_name ?? "",
    template_variables_json: stringifyTemplateVariables(row.template_variables),
    email_subject: row.email_subject ?? "",
    email_body: row.email_body ?? "",
    email_html: row.email_html ?? "",
    email_body_mode: hasHtml ? "html" : "plain",
  };
}

export function hiddenServiceDefaults(serviceKey: string, existing?: NotificationServiceItem) {
  return {
    webhook_path: existing?.webhook_path ?? serviceKey,
    require_blood_report_url: existing?.require_blood_report_url ?? false,
    require_bio_ai_report_url: existing?.require_bio_ai_report_url ?? false,
    require_participant_detail: existing?.require_participant_detail ?? false,
    require_otp: existing?.require_otp ?? false,
    require_session_details: existing?.require_session_details ?? false,
    require_external_link: existing?.require_external_link ?? false,
  };
}

export function buildContentFields(form: ServiceFormData): {
  template_name: string | null;
  template_variables: Record<string, unknown> | unknown[] | null;
  email_subject: string | null;
  email_body: string | null;
  email_html: string | null;
} {
  if (form.channel === "whatsapp") {
    let template_variables: Record<string, unknown> | unknown[] | null = null;
    if (form.template_variables_json.trim()) {
      template_variables = parseTemplateVariablesJson(form.template_variables_json);
    }
    return {
      template_name: form.template_name.trim() || null,
      template_variables,
      email_subject: null,
      email_body: null,
      email_html: null,
    };
  }
  return {
    template_name: null,
    template_variables: null,
    email_subject: form.email_subject.trim() || null,
    email_body:
      form.email_body_mode === "plain" ? form.email_body.trim() || null : null,
    email_html: form.email_body_mode === "html" ? form.email_html.trim() || null : null,
  };
}
