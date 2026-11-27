import { DiagnosticsCatalogShell } from "./DiagnosticsCatalogShell";
import { DiagnosticTests } from "./DiagnosticTests";

export function DiagnosticTestsListPage() {
  return (
    <DiagnosticsCatalogShell activeTab="tests">
      <DiagnosticTests />
    </DiagnosticsCatalogShell>
  );
}
