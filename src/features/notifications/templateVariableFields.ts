import type { CatalogEventItem } from "../../lib/api";

/** Mirrors dev-api modules/notifications/variable_catalog.py group fields. */
const VARIABLE_GROUP_FIELDS: Record<string, readonly string[]> = {
  staff: [
    "staff.name",
    "staff.first_name",
    "staff.last_name",
    "staff.phone",
    "staff.email",
  ],
  participant: [
    "participant.name",
    "participant.first_name",
    "participant.last_name",
    "participant.phone",
    "participant.email",
    "participant.age",
    "participant.gender",
    "participant.address",
    "participant.pincode",
  ],
};

export function isTeamRecipient(recipientType: string | null | undefined): boolean {
  const rt = (recipientType ?? "").trim();
  if (!rt) return false;
  if (
    rt === "assistants" ||
    rt === "assistants.phlebo" ||
    rt === "assistants.expert" ||
    rt === "assistants.staff" ||
    rt === "departments"
  ) {
    return true;
  }
  return rt.startsWith("departments.");
}

function fieldsForGroups(groups: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const fromCatalog = VARIABLE_GROUP_FIELDS[group];
    if (fromCatalog) {
      for (const field of fromCatalog) {
        if (!seen.has(field)) {
          seen.add(field);
          out.push(field);
        }
      }
    }
  }
  return out;
}

function variableGroupsForRecipient(
  eventGroups: string[],
  recipientType: string | null | undefined
): string[] {
  const groups = [...eventGroups];
  if (!isTeamRecipient(recipientType)) return groups;
  const prepend: string[] = [];
  if (!groups.includes("staff")) prepend.push("staff");
  if (!groups.includes("participant") && groups.includes("user")) prepend.push("participant");
  return [...prepend, ...groups];
}

/** Event catalog fields + staff/participant when the binding targets internal team recipients. */
export function templateVariableFieldsForRecipient(args: {
  event: CatalogEventItem | null | undefined;
  recipientType: string | null | undefined;
}): string[] {
  const event = args.event;
  if (!event) return [];
  const recipient = (args.recipientType ?? "").trim();
  if (!isTeamRecipient(recipient)) {
    return event.variable_fields ?? [];
  }
  const groups = variableGroupsForRecipient(event.variable_groups ?? [], recipient);
  const teamFields = fieldsForGroups(groups.filter((g) => g === "staff" || g === "participant"));
  const base = (event.variable_fields ?? []).filter((f) => !f.startsWith("user."));
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const f of [...teamFields, ...base]) {
    if (!seen.has(f)) {
      seen.add(f);
      merged.push(f);
    }
  }
  return merged;
}
