import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./commandTokens.css";
import { B2BTab } from "./B2BTab";
import { B2CTab } from "./B2CTab";
import { cn } from "./cn";
import { DateRangeControl } from "./controls";
import { DrillView } from "./DrillView";
import { OverviewTab } from "./OverviewTab";
import { useCommandDashboard, type CommandTab } from "./useCommandDashboard";

function tabFromPath(pathname: string): CommandTab {
  if (pathname.endsWith("/dashboard/b2b") || pathname.endsWith("/b2b")) return "b2b";
  if (pathname.endsWith("/dashboard/b2c") || pathname.endsWith("/b2c")) return "b2c";
  return "overview";
}

function pathForTab(tab: CommandTab): string {
  if (tab === "b2b") return "/dashboard/b2b";
  if (tab === "b2c") return "/dashboard/b2c";
  return "/";
}

export function CommandDashboard({
  registerRefetch,
}: {
  registerRefetch?: (refetch: () => void) => void;
}) {
  const ops = useCommandDashboard();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fromUrl = tabFromPath(location.pathname);
    if (fromUrl !== ops.tab) {
      ops.setTab(fromUrl);
      if (fromUrl === "overview") ops.setAudience("all");
      if (fromUrl === "b2b") ops.setAudience("b2b");
      if (fromUrl === "b2c") ops.setAudience("b2c");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL → tab only
  }, [location.pathname]);

  useEffect(() => {
    registerRefetch?.(() => {
      void ops.reload();
    });
  }, [registerRefetch, ops.reload]);

  const tabs: [CommandTab, string][] = [
    ["overview", "Overview"],
    ["b2b", "B2B"],
    ["b2c", "B2C"],
  ];

  const fillFold = !ops.drill && ops.tab === "overview";

  return (
    <div className={cn("dashboard-command min-w-0", fillFold && "overflow-hidden")}>
      <div
        className={cn(
          "mx-auto max-w-[1400px]",
          fillFold ? "flex h-[calc(100dvh-7.5rem)] min-h-0 flex-col gap-3 overflow-hidden" : "space-y-3",
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border bg-card p-0.5">
              {tabs.map(([t, l]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    ops.openDrill(null);
                    ops.setTab(t);
                    if (t === "overview") ops.setAudience("all");
                    if (t === "b2b") ops.setAudience("b2b");
                    if (t === "b2c") ops.setAudience("b2c");
                    navigate(pathForTab(t));
                  }}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm",
                    ops.tab === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <Link
              to="/serviceability"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/0.04)] hover:border-foreground/20"
            >
              <MapPin className="size-3.5" />
              Serviceability tracker
            </Link>
          </div>
          <DateRangeControl preset={ops.preset} range={ops.range} onChange={ops.setPeriod} />
        </div>

        {ops.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ops.error}
            <button type="button" className="ml-3 underline" onClick={() => void ops.reload()}>
              Retry
            </button>
          </div>
        )}

        {ops.loading && !ops.data ? (
          <div className="p-10 text-sm text-muted-foreground">Loading operations…</div>
        ) : (
          <div className={cn(fillFold && "min-h-0 flex-1 overflow-hidden")}>
            {ops.drill ? (
              <DrillView ops={ops} />
            ) : ops.tab === "overview" ? (
              <OverviewTab ops={ops} />
            ) : ops.tab === "b2b" ? (
              <B2BTab ops={ops} />
            ) : (
              <B2CTab ops={ops} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
