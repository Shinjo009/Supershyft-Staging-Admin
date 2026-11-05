import {
  ClipboardList,
  Droplets,
  FileText,
  Package,
  Search,
  Stethoscope,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, KpiCard, Section, StatusBadge } from "./bits";
import { cn } from "./cn";
import { fmtDay, inr } from "./dates";
import { JourneyDrawer } from "./JourneyDrawer";
import type { CommandDashboardState } from "./useCommandDashboard";

type InnerTab = "overview" | "users";

function str(v: unknown) {
  return v == null || v === "" ? "—" : String(v);
}

export function B2CTab({ ops }: { ops: CommandDashboardState }) {
  const data = ops.data;
  const [inner, setInner] = useState<InnerTab>("overview");
  const [q, setQ] = useState("");
  const [userRows, setUserRows] = useState<Record<string, unknown>[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<number | null>(null);
  const [drawerEngagementId, setDrawerEngagementId] = useState<number | null>(null);
  const usersLimit = 25;

  const loadDrill = ops.loadDrill;
  useEffect(() => {
    if (inner !== "users") return;
    let cancelled = false;
    setUsersLoading(true);
    void loadDrill({
      drill: "total_bookings",
      audience: "b2c",
      q: q || undefined,
      page: usersPage,
      limit: usersLimit,
    })
      .then((payload) => {
        if (!cancelled) {
          setUserRows(payload.items);
          setUsersTotal(payload.total ?? payload.items.length);
        }
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inner, q, usersPage, loadDrill]);

  if (!data) return <EmptyState title="No B2C data" />;

  const b2c = data.b2c;
  const userPages = Math.max(1, Math.ceil(usersTotal / usersLimit));

  const openUser = (r: Record<string, unknown>) => {
    if (typeof r.user_id === "number") {
      setDrawerUserId(r.user_id);
      setDrawerEngagementId(typeof r.engagement_id === "number" ? r.engagement_id : null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border bg-card p-0.5">
        {(
          [
            ["overview", "Overview"],
            ["users", "Users"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setInner(id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm",
              inner === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {inner === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid grid-cols-2 grid-rows-3 gap-3">
              <KpiCard
                compact
                tint="info"
                icon={Users}
                label="Total bookings"
                value={b2c.total_bookings}
                onClick={() =>
                  ops.openDrill({ drill: "total_bookings", title: "Total bookings", audience: "b2c" })
                }
              />
              <KpiCard
                compact
                tint="warning"
                live
                icon={Droplets}
                label="Collections tomorrow"
                value={b2c.collections_tomorrow}
                onClick={() =>
                  ops.openDrill({
                    drill: "collections_tomorrow",
                    title: "Collections tomorrow",
                    audience: "b2c",
                  })
                }
              />
              <KpiCard
                compact
                tint="success"
                icon={Droplets}
                label="Tests completed"
                value={b2c.tests_completed}
                onClick={() =>
                  ops.openDrill({ drill: "tests_completed", title: "Tests completed", audience: "b2c" })
                }
              />
              <KpiCard
                compact
                tint="warning"
                icon={FileText}
                label="Lab reports delivered"
                value={b2c.lab_reports_delivered}
                onClick={() =>
                  ops.openDrill({ drill: "lab_reports", title: "Lab reports", audience: "b2c" })
                }
              />
              <KpiCard
                compact
                tint="violet"
                icon={ClipboardList}
                label="Bio-AI reports"
                value={b2c.bio_ai_reports_generated}
                onClick={() =>
                  ops.openDrill({ drill: "bio_ai_reports", title: "Bio-AI reports", audience: "b2c" })
                }
              />
              <KpiCard
                compact
                tint="rose"
                icon={Stethoscope}
                label="Consultations done"
                value={b2c.consultations.total}
                hint={`${b2c.consultations.doctor} doctor · ${b2c.consultations.nutritionist} nutritionist`}
                onClick={() =>
                  ops.openDrill({ drill: "consultations", title: "Consultations", audience: "b2c" })
                }
              />
            </div>

            <Section title="Tomorrow's collections" icon={Droplets} bodyClassName="overflow-y-auto">
              {(b2c.tomorrows_collections ?? []).length === 0 ? (
                <EmptyState title="No collections tomorrow" />
              ) : (
                <ul className="divide-y">
                  {b2c.tomorrows_collections.map((row, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40"
                        onClick={() => openUser(row as Record<string, unknown>)}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{String(row.user_name ?? "—")}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {String(row.phone ?? "")} · {String(row.engagement_name ?? "")}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <div>{String(row.collection_time ?? "—")}</div>
                          {row.paid ? <StatusBadge status="confirmed" label="Paid" /> : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section
              title="Package performance"
              icon={Package}
              actions={
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    ops.openDrill({
                      drill: "package_performance",
                      title: "Package performance",
                      audience: "b2c",
                    })
                  }
                >
                  View all
                </button>
              }
            >
              {b2c.package_performance.length === 0 ? (
                <EmptyState title="No package bookings" />
              ) : (
                <ul className="divide-y">
                  {b2c.package_performance.map((p) => (
                    <li key={p.package_id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40"
                        onClick={() =>
                          ops.openDrill({
                            drill: `package_${p.package_id}`,
                            title: p.package_name,
                            audience: "b2c",
                          })
                        }
                      >
                        <span className="truncate font-medium">{p.package_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {p.bookings} · {inr(p.revenue_paise)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Coupon usage"
              icon={Ticket}
              actions={
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    ops.openDrill({ drill: "coupon_usage", title: "Coupon usage", audience: "b2c" })
                  }
                >
                  View all
                </button>
              }
            >
              {b2c.coupon_usage.length === 0 ? (
                <EmptyState title="No coupon usage" />
              ) : (
                <ul className="divide-y">
                  {b2c.coupon_usage.map((c) => (
                    <li key={c.discount_code_id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/40"
                        onClick={() =>
                          ops.openDrill({
                            drill: `coupon_${c.discount_code_id}`,
                            title: c.code,
                            audience: "b2c",
                          })
                        }
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{c.code}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{c.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.uses} uses · {inr(c.discount_paise)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setUsersPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search name, phone, email…"
              aria-label="Search users"
              className="h-9 w-full rounded-lg border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Section
            title="Users"
            description={
              usersLoading ? "Loading…" : `${usersTotal} booking${usersTotal === 1 ? "" : "s"}`
            }
          >
            {usersLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : userRows.length === 0 ? (
              <EmptyState title="No bookings found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">User</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Package</th>
                      <th className="px-3 py-2 font-medium">Mode / location</th>
                      <th className="px-3 py-2 font-medium">Collection</th>
                      <th className="px-3 py-2 font-medium">Questionnaire</th>
                      <th className="px-3 py-2 font-medium">Lab partner</th>
                      <th className="px-3 py-2 font-medium">Blood report</th>
                      <th className="px-3 py-2 font-medium">Bio-AI</th>
                      <th className="px-3 py-2 font-medium">Consult</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRows.map((r) => {
                      const mode = String(r.collection_mode ?? "").toLowerCase();
                      const modeLabel = mode.includes("home")
                        ? "Home collection"
                        : mode.includes("camp")
                          ? "At camp"
                          : mode
                            ? "Collection centre"
                            : "—";
                      const colDay =
                        typeof r.collection_date === "string" ? r.collection_date : null;
                      const colTime =
                        typeof r.collection_time === "string"
                          ? r.collection_time.slice(0, 5)
                          : "";
                      return (
                        <tr
                          key={String(r.booking_id ?? r.user_id)}
                          className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                          onClick={() => openUser(r)}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium">{str(r.user_name)}</div>
                            {r.email ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {str(r.email)}
                              </div>
                            ) : null}
                            <div className="text-xs text-muted-foreground">{str(r.phone)}</div>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {str(r.engagement_name) !== "—"
                              ? str(r.engagement_name)
                              : str(r.engagement_code)}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {str(r.package_name ?? r.entity_name)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-medium">{modeLabel}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {str(r.collection_location)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs tabular-nums">
                            {colDay ? `${fmtDay(colDay)}${colTime ? ` · ${colTime}` : ""}` : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.questionnaire_status ? (
                              <StatusBadge
                                status={str(r.questionnaire_status)}
                                className="px-1 text-[10px]"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs">{str(r.lab_partner)}</td>
                          <td className="px-3 py-2.5">
                            {r.lab_report_status ? (
                              <StatusBadge
                                status={str(r.lab_report_status)}
                                className="px-1 text-[10px]"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.bio_ai_status ? (
                              <StatusBadge
                                status={str(r.bio_ai_status)}
                                className="px-1 text-[10px]"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.consultation_status ? (
                              <StatusBadge
                                status={str(r.consultation_status)}
                                className="px-1 text-[10px]"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {userPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
                <span className="text-muted-foreground">
                  Page {usersPage} of {userPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={usersPage <= 1}
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={usersPage >= userPages}
                    className="rounded-md border px-2 py-1 disabled:opacity-40"
                    onClick={() => setUsersPage((p) => Math.min(userPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      <JourneyDrawer
        userId={drawerUserId}
        engagementId={drawerEngagementId}
        onClose={() => {
          setDrawerUserId(null);
          setDrawerEngagementId(null);
        }}
      />
    </div>
  );
}
