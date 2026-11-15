import { usePermissions } from "../../contexts/PermissionContext";
import { AccessDenied } from "../../pages/AccessDenied";
import { CommandDashboard } from "./command/CommandDashboard";

export function Dashboard() {
  const { hasAnyAccess } = usePermissions();

  if (!hasAnyAccess) {
    return (
      <AccessDenied
        title="No admin access assigned"
        description="Your account is active, but no admin categories have been assigned yet. Contact a full administrator."
        showHome={false}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <CommandDashboard />
    </div>
  );
}
