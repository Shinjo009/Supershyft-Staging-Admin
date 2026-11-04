import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dashboardApi,
  getApiError,
  type DashboardAudience,
  type DashboardCommandBootstrap,
  type DashboardCommandDrillPayload,
  type DashboardLifecycle,
} from "../../../lib/api";
import { presetRange, todayKey, yearRange, type DateRange, type PeriodPreset } from "./dates";

export type CommandTab = "overview" | "b2b" | "b2c";

export interface DrillState {
  drill: string;
  title: string;
  audience?: DashboardAudience;
}

export function useCommandDashboard() {
  const [tab, setTab] = useState<CommandTab>("overview");
  const [audience, setAudience] = useState<DashboardAudience>("all");
  const [lifecycle, setLifecycle] = useState<DashboardLifecycle>("ongoing");
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [range, setRange] = useState<DateRange>(() => presetRange("this_month", todayKey()));
  const [data, setData] = useState<DashboardCommandBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [campId, setCampId] = useState<number | null>(null);
  const [yearCache, setYearCache] = useState<Record<number, DashboardCommandBootstrap>>({});
  const yearCacheRef = useRef(yearCache);
  yearCacheRef.current = yearCache;

  const fetchCommand = useCallback(
    async (opts?: {
      audience?: DashboardAudience;
      from?: string;
      to?: string;
      lifecycle?: DashboardLifecycle;
    }) => {
      const params = {
        audience: opts?.audience ?? audience,
        from: opts?.from ?? (preset === "all_years" ? undefined : range.from),
        to: opts?.to ?? (preset === "all_years" ? undefined : range.to),
        lifecycle: opts?.lifecycle ?? lifecycle,
      };
      const res = await dashboardApi.command(params);
      return res.data.data;
    },
    [audience, lifecycle, preset, range.from, range.to],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchCommand();
      setData(payload);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [fetchCommand]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setPeriod = useCallback((next: PeriodPreset, nextRange: DateRange) => {
    setPreset(next);
    setRange(nextRange);
  }, []);

  const openDrill = useCallback((state: DrillState | null) => {
    setCampId(null);
    setDrill(state);
  }, []);

  const openCamp = useCallback((engagementId: number | null) => {
    setDrill(null);
    setCampId(engagementId);
  }, []);

  const loadYearBootstrap = useCallback(async (year: number) => {
    if (yearCacheRef.current[year]) return yearCacheRef.current[year];
    const yr = yearRange(year);
    const payload = await fetchCommand({ from: yr.from, to: yr.to });
    setYearCache((prev) => ({ ...prev, [year]: payload }));
    return payload;
  }, [fetchCommand]);

  const loadDrill = useCallback(
    async (params: {
      drill: string;
      audience?: DashboardAudience;
      page?: number;
      limit?: number;
      q?: string;
      city?: string;
      package_id?: number;
      discount_code_id?: number;
    }): Promise<DashboardCommandDrillPayload> => {
      const res = await dashboardApi.commandDrill({
        drill: params.drill,
        audience: params.audience ?? audience,
        from: preset === "all_years" ? undefined : range.from,
        to: preset === "all_years" ? undefined : range.to,
        lifecycle,
        page: params.page ?? 1,
        limit: params.limit ?? 25,
        q: params.q,
        city: params.city,
        package_id: params.package_id,
        discount_code_id: params.discount_code_id,
      });
      return res.data.data;
    },
    [audience, lifecycle, preset, range.from, range.to],
  );

  const selectedCamp = useMemo(() => {
    if (!campId || !data) return null;
    return data.b2b.camps.find((c) => c.engagement_id === campId) ?? null;
  }, [campId, data]);

  return {
    tab,
    setTab,
    audience,
    setAudience,
    lifecycle,
    setLifecycle,
    preset,
    range,
    setPeriod,
    data,
    loading,
    error,
    reload,
    drill,
    openDrill,
    campId,
    openCamp,
    selectedCamp,
    loadYearBootstrap,
    loadDrill,
  };
}

export type CommandDashboardState = ReturnType<typeof useCommandDashboard>;
