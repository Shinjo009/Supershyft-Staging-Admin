import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { HeaderActionButton } from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import { DiagnosticsCatalogShell } from "./DiagnosticsCatalogShell";
import { DiagnosticTestGroups } from "./DiagnosticTestGroups";

export function DiagnosticTestGroupsListPage() {
  const navigate = useNavigate();

  return (
    <DiagnosticsCatalogShell
      activeTab="test-groups"
      headerActions={
        <PermissionGate category="diagnostics" action="edit">
          <HeaderActionButton
            label="Add Test Group"
            icon={Plus}
            onClick={() => navigate("/diagnostics/test-groups/new")}
          />
        </PermissionGate>
      }
    >
      <DiagnosticTestGroups />
    </DiagnosticsCatalogShell>
  );
}
