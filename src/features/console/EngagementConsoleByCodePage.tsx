import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ConsoleLayout } from "../../layouts/ConsoleLayout";
import { consoleApi } from "../../lib/api";
import { EngagementConsolePage } from "./EngagementConsolePage";

function EngagementConsoleByCodeResolver({ engagementCode }: { engagementCode: string }) {
  const [resolvedId, setResolvedId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const needle = engagementCode.toLowerCase();

    consoleApi
      .listEngagements()
      .then((res) => {
        if (cancelled) return;
        const match = res.data.data.find(
          (eng) => (eng.engagement_code ?? "").trim().toLowerCase() === needle
        );
        setResolvedId(match?.engagement_id ?? null);
      })
      .catch(() => {
        if (!cancelled) setResolvedId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [engagementCode]);

  if (resolvedId === undefined) {
    return (
      <ConsoleLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" aria-hidden />
        </div>
      </ConsoleLayout>
    );
  }

  if (resolvedId == null) {
    return <Navigate to="/engagements/console" replace />;
  }

  return <EngagementConsolePage engagementId={resolvedId} />;
}

export function EngagementConsoleByCodePage() {
  const { engagementCode: engagementCodeParam } = useParams<{ engagementCode: string }>();
  const trimmedCode = (engagementCodeParam ?? "").trim();

  if (!trimmedCode) {
    return <Navigate to="/engagements/console" replace />;
  }

  return <EngagementConsoleByCodeResolver key={trimmedCode} engagementCode={trimmedCode} />;
}