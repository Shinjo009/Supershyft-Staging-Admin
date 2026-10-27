export type DiagnosticsCatalogTab = "packages" | "test-groups" | "tests" | "filter-chips";

export const DIAGNOSTICS_CATALOG_PATHS: Record<DiagnosticsCatalogTab, string> = {
  packages: "/diagnostics/packages",
  "test-groups": "/diagnostics/test-groups",
  tests: "/diagnostics/tests",
  "filter-chips": "/diagnostics/filter-chips",
};

export const DIAGNOSTICS_TEST_GROUPS_LIST = DIAGNOSTICS_CATALOG_PATHS["test-groups"];
