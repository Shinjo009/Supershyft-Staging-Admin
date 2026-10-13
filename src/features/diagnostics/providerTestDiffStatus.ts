import type { ProviderTestDiffResponse } from "../../lib/api";

export type TestSyncKind = "matched" | "only_in_package" | "not_linked" | "unknown";

export function testSyncKind(
  diff: ProviderTestDiffResponse | null | undefined,
  testId: number
): TestSyncKind {
  if (!diff) return "unknown";
  if (diff.matched.some((row) => row.test_id === testId)) return "matched";
  if (diff.only_in_package.some((row) => row.test_id === testId)) return "only_in_package";
  if (diff.not_linked.some((row) => row.test_id === testId)) return "not_linked";
  return "unknown";
}
