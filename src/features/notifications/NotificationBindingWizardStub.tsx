import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function NotificationBindingWizardStub() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <Link
        to="/notifications/notifications"
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to notifications
      </Link>

      <h1 className="text-xl font-semibold text-zinc-900 mb-2">Create notification binding</h1>
      <p className="text-sm text-zinc-600 mb-4">
        The 3-step wizard (choose event, recipient, and services) is planned for the next release.
        Until then, edit existing bindings from the Notifications tab or ask engineering to add bindings via
        the API.
      </p>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Coming soon</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Select event from the hardcoded catalog</li>
          <li>Choose recipient rules</li>
          <li>Attach notification services and content</li>
        </ol>
      </div>
    </div>
  );
}
