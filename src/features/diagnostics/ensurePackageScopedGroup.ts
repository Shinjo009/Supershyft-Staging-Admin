import { diagnosticPackagesApi } from "../../lib/api";

export async function ensurePackageScopedGroupId(
  packageId: number,
  groupId: number
): Promise<{ groupId: number; forked: boolean }> {
  const res = await diagnosticPackagesApi.forkTestGroupForPackage(packageId, groupId);
  const data = res.data.data;
  return { groupId: data.group_id, forked: data.forked };
}
