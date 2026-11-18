import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  commandDashboardApi,
  getApiError,
  type CommandB2CUserRow,
} from "../../../lib/api";
import { B2CUserTable } from "./B2CUserTable";

export function B2CUsersTab() {
  const [rows, setRows] = useState<CommandB2CUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .b2cUsers({ page, limit })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.data ?? []);
        setTotal(res.data.meta?.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3" data-testid="b2c-users-tab">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Users className="size-3.5 text-zinc-500" aria-hidden />
          Users
        </h2>
        <span className="text-xs text-zinc-500">({total})</span>
      </div>
      <B2CUserTable
        rows={rows}
        loading={loading}
        error={error}
        emptyLabel="No B2C users found."
        total={total}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        testId="b2c-users-table"
      />
    </div>
  );
}
