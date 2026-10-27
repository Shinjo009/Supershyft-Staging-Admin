import { Link } from "react-router-dom";
import { PageHeaderActions } from "../../layouts/PageHeaderActions";
import {
  DIAGNOSTICS_CATALOG_PATHS,
  type DiagnosticsCatalogTab,
} from "./diagnosticsCatalogPaths";

const TABS: { key: DiagnosticsCatalogTab; label: string }[] = [
  { key: "packages", label: "Packages" },
  { key: "test-groups", label: "Test Groups" },
  { key: "tests", label: "Tests" },
  { key: "filter-chips", label: "Filter chips" },
];

export function DiagnosticsCatalogShell({
  activeTab,
  headerActions,
  children,
}: {
  activeTab: DiagnosticsCatalogTab;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      {headerActions ? <PageHeaderActions>{headerActions}</PageHeaderActions> : null}

      <div className="flex gap-1 mb-5 border-b border-zinc-200 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            to={DIAGNOSTICS_CATALOG_PATHS[tab.key]}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
