import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Pencil } from "lucide-react";
import {
  HeaderActionButton,
  PageHeaderActions,
  usePageHeader,
} from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import { diagnosticTestGroupsApi, getApiError, type DiagnosticTestGroupStandalone } from "../../lib/api";
import { DiagnosticTestGroupDetailContent } from "./DiagnosticTestGroupDetailContent";
import { TestGroupProviderSwitcher } from "./TestGroupProviderSwitcher";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";

import { DIAGNOSTICS_TEST_GROUPS_LIST } from "./diagnosticsCatalogPaths";

const LIST_BACK = DIAGNOSTICS_TEST_GROUPS_LIST;

function parseGroupId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function DiagnosticTestGroupDetailPage() {
  const { groupId: groupIdParam } = useParams<{ groupId: string }>();
  const groupId = parseGroupId(groupIdParam);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DiagnosticTestGroupStandalone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHeader = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await diagnosticTestGroupsApi.get(groupId);
      setDetail(res.data.data);
    } catch (err) {
      setError(getApiError(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadHeader();
  }, [loadHeader]);

  const headerConfig = useMemo(() => {
    if (!detail) return null;
    const subtitle = [
      diagnosticProviderDisplayLabel(detail.diagnostic_provider),
      `${detail.test_count ?? 0} tests assigned`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: detail.group_name,
      subtitle,
      backTo: LIST_BACK,
    };
  }, [detail]);

  usePageHeader(headerConfig);

  const openEdit = () => {
    if (!groupId) return;
    navigate(`/diagnostics/test-groups/${groupId}/edit`);
  };

  if (!groupId) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid group id.{" "}
        <Link to={LIST_BACK} className="underline">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl w-full mx-auto">
      {detail && (
        <PageHeaderActions>
          <PermissionGate category="diagnostics" action="edit" taskKey="tests_groups">
            <HeaderActionButton label="Edit" icon={Pencil} onClick={openEdit} variant="secondary" />
          </PermissionGate>
        </PageHeaderActions>
      )}

      {detail && (
        <TestGroupProviderSwitcher
          currentGroupId={groupId}
          detail={detail}
          mode="view"
          onSetDefaultComplete={() => void loadHeader()}
          onGroupDeleted={() => void loadHeader()}
          labCount={1 + (detail.same_test_groups?.length ?? 0)}
        />
      )}

      {loading && !detail ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
        </div>
      ) : error && !detail ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : (
        <DiagnosticTestGroupDetailContent groupId={groupId} onUpdated={() => void loadHeader()} />
      )}
    </div>
  );
}
