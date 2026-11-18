import { Link } from "react-router-dom";
import { Plus, Settings2, Trash2 } from "lucide-react";

import type { EngagementNotificationSetupEventRow } from "../../lib/api";
import type { EngagementNotificationTriggerRow } from "../../lib/engagementNotificationTriggers";
import { Modal } from "../../shared/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  event: EngagementNotificationSetupEventRow | null;
  rows: EngagementNotificationTriggerRow[];
  editable: boolean;
  platformDefaultsOnly: boolean;
  addNotificationTo?: string;
  addNotificationState?: Record<string, unknown>;
  onCustomizePlatformDefaults?: () => void;
  onEditRow?: (row: EngagementNotificationTriggerRow) => void;
  onDeleteRow?: (row: EngagementNotificationTriggerRow) => void;
};

export function EngagementEventNotificationsModal({
  open,
  onClose,
  event,
  rows,
  editable,
  platformDefaultsOnly,
  addNotificationTo,
  addNotificationState,
  onCustomizePlatformDefaults,
  onEditRow,
  onDeleteRow,
}: Props) {
  if (!event) return null;

  return (
    <Modal open={open} onClose={onClose} title={event.name} maxWidthClassName="max-w-2xl">
      <div className="space-y-4" data-testid="engagement-event-notifications-modal">
        <p className="text-xs font-mono text-zinc-500">{event.event_code}</p>
        {platformDefaultsOnly ? (
          <p className="text-sm text-zinc-600">
            These are platform defaults for this event. Customize to override for this engagement.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No notifications configured for this event.</p>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                  <th className="px-3 py-2 font-medium">Notification</th>
                  {editable ? <th className="px-3 py-2 font-medium w-28">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.key} data-testid="engagement-notification-trigger-row">
                    <td className="px-3 py-2.5 text-zinc-900">{row.recipientLabel}</td>
                    <td className="px-3 py-2.5 text-zinc-900">{row.notificationLabel}</td>
                    {editable ? (
                      <td className="px-3 py-2.5">
                        {row.platformDefault ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditRow?.(row)}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                              title="Edit notification"
                              aria-label="Edit notification"
                              data-testid="engagement-notification-edit-row"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRow?.(row)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-zinc-100"
                              title="Remove notification"
                              aria-label="Remove notification"
                              data-testid="engagement-notification-delete-row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editable ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
            {platformDefaultsOnly && onCustomizePlatformDefaults ? (
              <button
                type="button"
                onClick={() => onCustomizePlatformDefaults()}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 underline-offset-2 hover:underline"
              >
                Customize platform defaults for this engagement
              </button>
            ) : (
              <span />
            )}
            {addNotificationTo ? (
              <Link
                to={addNotificationTo}
                state={addNotificationState}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
                data-testid="engagement-notification-add-binding"
              >
                <Plus className="w-4 h-4" />
                Add notification
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}