import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Search, ChevronRight } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { PermissionGate } from "../../contexts/PermissionContext";
import {
  notificationBindingsApi,
  notificationsCatalogApi,
  type CatalogEventItem,
  type NotificationBindingItem,
  getApiError,
} from "../../lib/api";
import {
  RECIPIENT_LABELS,
  buildNotificationCatalogSections,
  uniqueChannels,
} from "./notificationsUiShared";

function uniqueRecipientLabels(bindings: NotificationBindingItem[]): string {
  const labels = [
    ...new Set(
      bindings.map((b) => (RECIPIENT_LABELS[b.recipient_type] ?? b.recipient_type).trim()).filter(Boolean)
    ),
  ];
  if (!labels.length) return "—";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

export function NotificationBindingsTab() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<CatalogEventItem[]>([]);
  const [data, setData] = useState<NotificationBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, bindRes] = await Promise.all([
        notificationsCatalogApi.getEvents(),
        notificationBindingsApi.list(),
      ]);
      setCatalog(catRes.data.data);
      setData(bindRes.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const sections = useMemo(
    () => buildNotificationCatalogSections(catalog, data, searchQuery),
    [catalog, data, searchQuery]
  );

  const configuredCount = useMemo(
    () => data.filter((b) => (b.notification_services?.length ?? 0) > 0).length,
    [data]
  );

  return (
    <>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-md flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, groups, recipients…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <PageHeaderActions>
          <PermissionGate category="notifications" taskKey="defaults" action="edit">
            <HeaderActionButton
              label="Add notification"
              icon={Plus}
              onClick={() => navigate("/notifications/notifications/new")}
            />
          </PermissionGate>
        </PageHeaderActions>
      </div>

      {!loading && data.length > 0 ? (
        <p className="mb-3 text-xs text-zinc-500">
          Global defaults — {configuredCount} binding{configuredCount === 1 ? "" : "s"} configured. Per-engagement
          overrides are set on each engagement&apos;s Notifications step.
        </p>
      ) : null}

      <div className="space-y-8">
        {loading ? (
          <div className="py-12 flex justify-center bg-white rounded-xl border border-zinc-200">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : sections.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-zinc-500 bg-white rounded-xl border border-zinc-200">
            {catalog.length === 0
              ? "Could not load notification catalog."
              : "No events match your search."}
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.group} className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900">{section.group}</h2>
              <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                {section.events.map(({ event, bindings: eventBindings, bindingCount }) => (
                  <button
                    key={`${section.group}:${event.code}`}
                    type="button"
                    onClick={() =>
                      navigate(`/notifications/notifications/events/${encodeURIComponent(event.code)}`)
                    }
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 truncate">{event.name}</div>
                      <div className="text-xs font-mono text-zinc-500 mt-0.5">{event.code}</div>
                    </div>
                    <div className="hidden sm:block text-sm text-zinc-600 shrink-0">
                      {bindingCount > 0 ? (
                        <>
                          {uniqueRecipientLabels(eventBindings)} · {uniqueChannels(eventBindings)}
                        </>
                      ) : (
                        <span className="text-amber-700">Not configured</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 shrink-0">
                      {bindingCount > 0 ? `${bindingCount} binding${bindingCount === 1 ? "" : "s"}` : "—"}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
