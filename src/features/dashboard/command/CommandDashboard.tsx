import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  commandDashboardApi,
  getApiError,
  serverHealthApi,
  type CommandNotificationHealth,
} from "../../../lib/api";
import { NotificationHealthDetail } from "./NotificationHealthDetail";
import { OverviewGrid } from "./OverviewGrid";
import { PeriodFilter } from "./PeriodFilter";
import { PeopleRegisteredDetail } from "./PeopleRegisteredDetail";
import { TabBar } from "./TabBar";
import {
  DEFAULT_PERIOD,
  normalizeCard,
  normalizePeriod,
  normalizeTab,
  type CardId,
  type DashboardTab,
  type PeriodPreset,
} from "./period";

function buildPeriodParams(
  period: PeriodPreset,
  from: string | null,
  to: string | null
) {
  if (period === "custom" && from && to) {
    return { period, from, to };
  }
  return { period };
}

export function CommandDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const rawPeriod = searchParams.get("period");
  const rawCard = searchParams.get("card");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const tab = normalizeTab(rawTab);
  const period = normalizePeriod(rawPeriod);
  const card = normalizeCard(rawCard);

  // Normalize URL defaults / invalid values once they diverge
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (rawTab !== tab) {
      next.set("tab", tab);
      changed = true;
    }
    if (rawPeriod !== period) {
      next.set("period", period);
      changed = true;
    }
    if (period !== "custom") {
      if (next.has("from") || next.has("to")) {
        next.delete("from");
        next.delete("to");
        changed = true;
      }
    }
    if (rawCard && !card) {
      next.delete("card");
      changed = true;
    }

    if (changed) setSearchParams(next, { replace: true });
    // Intentionally depend on raw query pieces, not the whole searchParams object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab, rawPeriod, rawCard, tab, period, card, from, to, setSearchParams]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setTab = (nextTab: DashboardTab) => {
    updateParams({ tab: nextTab, card: null });
  };

  const setPeriod = (nextPeriod: PeriodPreset) => {
    updateParams({
      period: nextPeriod,
      from: null,
      to: null,
    });
  };

  const setCustom = (nextFrom: string, nextTo: string) => {
    updateParams({
      period: "custom",
      from: nextFrom,
      to: nextTo,
    });
  };

  const openCard = (id: CardId) => {
    updateParams({ card: id, tab: "overview" });
  };

  const closeCard = () => {
    updateParams({ card: null });
  };

  const periodParams = useMemo(
    () => buildPeriodParams(period, from, to),
    [period, from, to]
  );

  const [server, setServer] = useState<{
    cpu: number | null;
    memory: number | null;
    storage: number | null;
  }>({ cpu: null, memory: null, storage: null });
  const [loadingServer, setLoadingServer] = useState(true);
  const [notif, setNotif] = useState<CommandNotificationHealth | null>(null);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [peopleTotal, setPeopleTotal] = useState<number | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingServer(true);
    serverHealthApi
      .current()
      .then((res) => {
        if (cancelled) return;
        const metrics = res.data.data?.latest_metrics;
        const run = res.data.data?.run;
        setServer({
          cpu: metrics?.cpu_usage ?? run?.cpu_pct ?? null,
          memory: metrics?.memory_usage ?? run?.mem_pct ?? null,
          storage: metrics?.storage_usage ?? run?.storage_pct ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError((prev) => prev ?? getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingServer(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingNotif(true);
    setLoadingPeople(true);
    Promise.all([
      commandDashboardApi.notificationHealth(periodParams),
      commandDashboardApi.peopleRegistered({
        ...periodParams,
        include_rows: false,
        page: 1,
        limit: 1,
      }),
    ])
      .then(([notifRes, peopleRes]) => {
        if (cancelled) return;
        setNotif(notifRes.data.data);
        setPeopleTotal(peopleRes.data.meta?.total ?? 0);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingNotif(false);
          setLoadingPeople(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [periodParams.period, periodParams.from, periodParams.to]);

  const showTabs = !card;

  return (
    <div className="min-w-0 space-y-4" data-testid="command-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showTabs ? (
          <TabBar active={tab} onChange={setTab} />
        ) : (
          <div data-testid="tabs-hidden" aria-hidden className="h-9" />
        )}
        <PeriodFilter
          period={period || DEFAULT_PERIOD}
          from={from}
          to={to}
          onPeriodChange={setPeriod}
          onCustomApply={setCustom}
        />
      </div>

      {loadError && !card ? (
        <p className="text-sm text-amber-700" role="status">
          {loadError}
        </p>
      ) : null}

      {card === "notification_health" ? (
        <NotificationHealthDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "people_registered" ? (
        <PeopleRegisteredDetail periodParams={periodParams} onBack={closeCard} />
      ) : (
        <OverviewGrid
          server={server}
          notificationHealth={notif}
          peopleTotal={peopleTotal}
          loadingServer={loadingServer}
          loadingNotif={loadingNotif}
          loadingPeople={loadingPeople}
          onOpenCard={openCard}
        />
      )}
    </div>
  );
}
