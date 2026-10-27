import { DiagnosticsCatalogShell } from "./DiagnosticsCatalogShell";
import { DiagnosticFilterChips } from "./DiagnosticFilterChips";

export function DiagnosticFilterChipsListPage() {
  return (
    <DiagnosticsCatalogShell activeTab="filter-chips">
      <DiagnosticFilterChips embedded />
    </DiagnosticsCatalogShell>
  );
}
