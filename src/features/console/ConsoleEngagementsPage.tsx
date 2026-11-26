import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, Users, Calendar } from "lucide-react";
import { ConsoleLayout } from "../../layouts/ConsoleLayout";
import { useAuth } from "../../contexts/AuthContext";
import {
  consoleApi,
  getApiError,
  type ConsoleEngagementListItem,
} from "../../lib/api";

function engagementLabel(eng: ConsoleEngagementListItem): string {
  return eng.engagement_name || eng.engagement_code || `Engagement ${eng.engagement_id}`;
}

export function ConsoleEngagementsPage() {
  const { employeeRole } = useAuth();
  const isAdmin = employeeRole === "admin";
  const isOrgManager = employeeRole === "organization_manager";

  const [engagements, setEngagements] = useState<ConsoleEngagementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const loadEngagements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await consoleApi.listEngagements({ page, limit });
      setEngagements(res.data.data);
      setTotal(res.data.meta?.total ?? res.data.data.length);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void loadEngagements();
  }, [loadEngagements]);

  const title = isAdmin
    ? "Engagement Console"
    : isOrgManager
      ? "Your Organization Engagements"
      : "Your Engagements";

  const subtitle = isAdmin
    ? "All running engagements."
    : isOrgManager
      ? "Engagements assigned to you where you are the organization contact person."
      : "Running engagements assigned to you as an onboarding assistant.";

  const emptyMessage = isAdmin
    ? "No running engagements."
    : isOrgManager
      ? "No engagements assigned to you for your organization."
      : "No running engagements assigned to you.";

  return (
    <ConsoleLayout
      backHref={isAdmin ? "/engagements" : isOrgManager ? "/organisations" : undefined}
      backLabel={
        isAdmin ? "Back to Engagements" : isOrgManager ? "Back to Organisations" : undefined
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        ) : engagements.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">{emptyMessage}</div>
        ) : (
          <>
            <ul className="space-y-3">
              {engagements.map((eng) => (
                <li key={eng.engagement_id}>
                  <Link
                    to={`/engagements/${eng.engagement_id}/console`}
                    className="block p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">
                          {engagementLabel(eng)}
                        </p>
                        {eng.engagement_code && (
                          <p className="text-xs text-zinc-500 mt-0.5">{eng.engagement_code}</p>
                        )}
                        {(eng.start_date || eng.end_date) && (
                          <p className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {eng.start_date ?? "—"} — {eng.end_date ?? "—"}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        <span>{eng.participant_count ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {total > limit && (
              <div className="flex items-center justify-between gap-3 pt-2 text-sm text-zinc-600">
                <span>
                  Page {page} of {Math.max(1, Math.ceil(total / limit))}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-zinc-200 px-3 py-1.5 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page * limit >= total || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-zinc-200 px-3 py-1.5 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ConsoleLayout>
  );
}
