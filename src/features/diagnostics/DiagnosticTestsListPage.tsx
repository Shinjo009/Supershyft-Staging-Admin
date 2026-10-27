import { useState } from "react";
import { Plus } from "lucide-react";
import { HeaderActionButton } from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import { DiagnosticsCatalogShell } from "./DiagnosticsCatalogShell";
import { DiagnosticTests } from "./DiagnosticTests";

export function DiagnosticTestsListPage() {
  const [openCreateTest, setOpenCreateTest] = useState<(() => void) | null>(null);

  return (
    <DiagnosticsCatalogShell
      activeTab="tests"
      headerActions={
        <PermissionGate category="diagnostics" action="edit">
          <HeaderActionButton label="Add Test" icon={Plus} onClick={() => openCreateTest?.()} />
        </PermissionGate>
      }
    >
      <DiagnosticTests onRequestCreate={(trigger) => setOpenCreateTest(() => trigger)} />
    </DiagnosticsCatalogShell>
  );
}
