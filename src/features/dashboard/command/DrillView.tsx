import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardAudience } from "../../../lib/api";
import { EmptyState, Section, StatusBadge } from "./bits";
import { fmtDay, inr } from "./dates";
import { JourneyDrawer } from "./JourneyDrawer";
import type { CommandDashboardState } from "./useCommandDashboard";

type Col = { key: string; header: string; cell: (r: Record<string, unknown>) => React.ReactNode };

function str(v: unknown) {
  return v == null || v === "" ? "—" : String(v);
}

function personCell(r: Record<string, unknown>) {
  return (
    <div className="min-w-[140px]">
      <div className="font-medium">{str(r.user_name)}</div>
      {r.email ? <div className="truncate text-xs text-muted-foreground">{str(r.email)}</div> : null}
      <div className="whitespace-nowrap text-xs text-muted-foreground">{str(r.phone)}</div>
    </div>
  );
}

function collectionWhen(r: Record<string, unknown>) {
  const day = typeof r.collection_date === "string" ? r.collection_date : null;
  const time = typeof r.collection_time === "string" ? r.collection_time.slice(0, 5) : "";
  if (!day) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap text-xs tabular-nums">
      {fmtDay(day)}
      {time ? ` · ${time}` : ""}
    </span>
  );
}

/** Design JourneyTable (mixed) — Person, Type, Source, Package, Collection, Blood, Q, Lab, Bio-AI, Consult */
function mixedJourneyCols(): Col[] {
  return [
    { key: "name", header: "User", cell: personCell },
    {
      key: "type",
      header: "Type",
      cell: (r) => {
        const a = String(r.audience ?? "").toLowerCase();
        const label = a === "b2b" ? "B2B" : a === "b2c" ? "B2C" : str(r.audience);
        return (
          <span
            className={
              a === "b2b"
                ? "rounded px-1.5 py-0.5 text-[10px] font-semibold bg-accent text-accent-foreground"
                : "rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground"
            }
          >
            {label}
          </span>
        );
      },
    },
    {
      key: "src",
      header: "Source",
      cell: (r) => {
        const name = str(r.engagement_name);
        const code = str(r.engagement_code);
        return <span className="text-xs">{name !== "—" ? name : code}</span>;
      },
    },
    {
      key: "pkg",
      header: "Package",
      cell: (r) => <span className="text-xs">{str(r.package_name ?? r.entity_name)}</span>,
    },
    { key: "col", header: "Collection", cell: collectionWhen },
    {
      key: "blood",
      header: "Blood collection",
      cell: (r) =>
        r.collection_status ? <StatusBadge status={str(r.collection_status)} /> : "—",
    },
    {
      key: "q",
      header: "Questionnaire",
      cell: (r) =>
        r.questionnaire_status ? <StatusBadge status={str(r.questionnaire_status)} /> : "—",
    },
    {
      key: "lab",
      header: "Lab report",
      cell: (r) =>
        r.lab_report_status ? <StatusBadge status={str(r.lab_report_status)} /> : "—",
    },
    {
      key: "bio",
      header: "Bio-AI",
      cell: (r) => (r.bio_ai_status ? <StatusBadge status={str(r.bio_ai_status)} /> : "—"),
    },
    {
      key: "con",
      header: "Consult",
      cell: (r) =>
        r.consultation_status ? <StatusBadge status={str(r.consultation_status)} /> : "—",
    },
  ];
}

/** Design JourneyTable (b2c) — Customer, Package, Mode/location, Collection, Q, Lab partner, Blood report, Bio-AI, Consult */
function b2cJourneyCols(): Col[] {
  return [
    {
      key: "name",
      header: "User",
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{str(r.user_name)}</div>
          {r.email ? <div className="truncate text-xs text-muted-foreground">{str(r.email)}</div> : null}
          <div className="whitespace-nowrap text-xs text-muted-foreground">{str(r.phone)}</div>
        </div>
      ),
    },
    {
      key: "src",
      header: "Source",
      cell: (r) => {
        const name = str(r.engagement_name);
        const code = str(r.engagement_code);
        return <span className="text-xs">{name !== "—" ? name : code}</span>;
      },
    },
    {
      key: "pkg",
      header: "Package",
      cell: (r) => (
        <span className="line-clamp-2 text-xs">{str(r.package_name ?? r.entity_name)}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode / location",
      cell: (r) => {
        const mode = String(r.collection_mode ?? "").toLowerCase();
        const modeLabel = mode.includes("home")
          ? "Home collection"
          : mode.includes("camp")
            ? "At camp"
            : mode
              ? "Collection centre"
              : "—";
        return (
          <div className="min-w-0">
            <div className="text-xs font-medium">{modeLabel}</div>
            <div className="truncate text-xs text-muted-foreground" title={str(r.collection_location)}>
              {str(r.collection_location)}
            </div>
          </div>
        );
      },
    },
    { key: "col", header: "Collection", cell: collectionWhen },
    {
      key: "q",
      header: "Questionnaire",
      cell: (r) =>
        r.questionnaire_status ? (
          <StatusBadge status={str(r.questionnaire_status)} className="px-1 text-[10px]" />
        ) : (
          "—"
        ),
    },
    {
      key: "lab_p",
      header: "Lab partner",
      cell: (r) => <span className="text-xs">{str(r.lab_partner)}</span>,
    },
    {
      key: "lab",
      header: "Blood report",
      cell: (r) =>
        r.lab_report_status ? (
          <StatusBadge status={str(r.lab_report_status)} className="px-1 text-[10px]" />
        ) : (
          "—"
        ),
    },
    {
      key: "bio",
      header: "Bio-AI",
      cell: (r) =>
        r.bio_ai_status ? (
          <StatusBadge status={str(r.bio_ai_status)} className="px-1 text-[10px]" />
        ) : (
          "—"
        ),
    },
    {
      key: "con",
      header: "Consult",
      cell: (r) =>
        r.consultation_status ? (
          <StatusBadge status={str(r.consultation_status)} className="px-1 text-[10px]" />
        ) : (
          "—"
        ),
    },
  ];
}

function colsForDrill(drill: string, audience?: string): Col[] {
  const b2c = audience === "b2c";
  const journeyDrill = [
    "tests_completed",
    "lab_reports",
    "reports_delivered",
    "upcoming_collections",
    "overdue_collections",
    "blood_reports_pending",
    "collections_tomorrow",
    "bio_ai_pending",
    "questionnaire_pending",
    "bio_ai_reports",
    "questionnaire_done",
    "consultations",
    "consultations_pending",
  ].includes(drill);

  if (journeyDrill) {
    return b2c ? b2cJourneyCols() : mixedJourneyCols();
  }

  if (drill === "people_registered") {
    return [
      { key: "person", header: "User", cell: personCell },
      { key: "email", header: "Email", cell: (r) => <span className="text-xs">{str(r.email)}</span> },
      { key: "city", header: "City", cell: (r) => str(r.city) },
      {
        key: "created",
        header: "Registered",
        cell: (r) =>
          fmtDay(typeof r.created_at === "string" ? r.created_at.slice(0, 10) : null),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => (r.status ? <StatusBadge status={str(r.status)} /> : "—"),
      },
    ];
  }

  if (drill.startsWith("tickets")) {
    return [
      { key: "id", header: "Ticket", cell: (r) => <span className="font-mono text-xs">{str(r.ticket_id)}</span> },
      { key: "query", header: "Query", cell: (r) => <span className="text-sm">{str(r.query_text)}</span> },
      { key: "contact", header: "Contact", cell: (r) => <span className="text-xs">{str(r.contact_input)}</span> },
      { key: "status", header: "Status", cell: (r) => <StatusBadge status={str(r.status)} /> },
      {
        key: "raised",
        header: "Raised",
        cell: (r) =>
          fmtDay(typeof r.created_at === "string" ? r.created_at.slice(0, 10) : null),
      },
    ];
  }

  if (drill === "failed_notifications") {
    return [
      {
        key: "recipient",
        header: "Recipient",
        cell: (r) => <span className="text-sm">{str(r.recipient_name)}</span>,
      },
      {
        key: "engagement",
        header: "Engagement",
        cell: (r) => {
          const name = str(r.engagement_name);
          const code = str(r.engagement_code);
          return <span className="text-xs">{name !== "—" ? name : code}</span>;
        },
      },
      {
        key: "message",
        header: "Message",
        cell: (r) => (
          <span className="block max-w-xs truncate text-xs" title={str(r.message)}>
            {str(r.message)}
          </span>
        ),
      },
    ];
  }

  if (drill === "b2b_camps" || drill === "open_engagements") {
    return [
      {
        key: "camp",
        header: "Camp",
        cell: (r) => (
          <div>
            <div className="font-medium">{str(r.engagement_name ?? r.entity_name)}</div>
            <div className="text-xs text-muted-foreground">{str(r.engagement_code ?? r.kind)}</div>
          </div>
        ),
      },
      { key: "org", header: "Organisation", cell: (r) => str(r.organization_name) },
      { key: "city", header: "City", cell: (r) => str(r.city) },
      {
        key: "dates",
        header: "Dates",
        cell: (r) =>
          `${fmtDay(str(r.start_date) === "—" ? null : str(r.start_date))} – ${fmtDay(
            str(r.end_date) === "—" ? null : str(r.end_date),
          )}`,
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => <StatusBadge status={str(r.status ?? r.lifecycle)} />,
      },
    ];
  }

  // Package / coupon aggregate lists
  if (drill === "package_performance") {
    return [
      { key: "name", header: "Package", cell: (r) => str(r.package_name) },
      { key: "bookings", header: "Bookings", cell: (r) => str(r.bookings) },
      {
        key: "rev",
        header: "Revenue",
        cell: (r) => (typeof r.revenue_paise === "number" ? inr(r.revenue_paise) : "—"),
      },
    ];
  }
  if (drill === "coupon_usage") {
    return [
      { key: "code", header: "Code", cell: (r) => str(r.code) },
      { key: "name", header: "Name", cell: (r) => str(r.name) },
      { key: "uses", header: "Uses", cell: (r) => str(r.uses) },
      {
        key: "disc",
        header: "Discount",
        cell: (r) => (typeof r.discount_paise === "number" ? inr(r.discount_paise) : "—"),
      },
    ];
  }

  // Per-package / per-coupon / bookings → B2C journey columns
  if (
    drill === "total_bookings" ||
    drill === "payment_failed" ||
    drill === "booking_issues" ||
    drill.startsWith("package_") ||
    drill.startsWith("coupon_")
  ) {
    return b2cJourneyCols();
  }

  return [
    {
      key: "primary",
      header: "User",
      cell: (r) => str(r.user_name ?? r.engagement_name ?? r.package_name ?? r.code ?? r.ticket_id),
    },
    {
      key: "details",
      header: "Details",
      cell: (r) => str(r.phone ?? r.email ?? r.entity_name ?? r.query_text ?? r.service_key),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (r.status ? <StatusBadge status={str(r.status)} /> : "—"),
    },
  ];
}

function isUserRow(row: Record<string, unknown>) {
  return typeof row.user_id === "number";
}

function isCampRow(row: Record<string, unknown>) {
  return (
    (typeof row.engagement_code === "string" && row.engagement_code) ||
    (typeof row.engagement_id === "number" &&
      (row.kind === "b2b_camp" || row.organization_name != null) &&
      !isUserRow(row))
  );
}

function userListFilters(drill: string) {
  if (
    drill === "failed_notifications" ||
    drill === "b2b_camps" ||
    drill === "open_engagements" ||
    drill === "package_performance" ||
    drill === "coupon_usage" ||
    drill.startsWith("tickets")
  ) {
    return false;
  }
  return true;
}

export function DrillView({ ops }: { ops: CommandDashboardState }) {
  const navigate = useNavigate();
  const d = ops.drill!;
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<DashboardAudience>(d.audience ?? "all");
  const [drawerUserId, setDrawerUserId] = useState<number | null>(null);
  const [drawerEngagementId, setDrawerEngagementId] = useState<number | null>(null);
  const limit = 25;
  const showUserFilters = userListFilters(d.drill);
  const cols = useMemo(() => colsForDrill(d.drill, audienceFilter), [d.drill, audienceFilter]);

  const loadDrill = ops.loadDrill;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadDrill({
      drill: d.drill,
      audience: showUserFilters ? audienceFilter : d.audience,
      page,
      limit,
      q: q || undefined,
      city: showUserFilters && city.trim() ? city.trim() : undefined,
    })
      .then((payload) => {
        if (cancelled) return;
        setItems(payload.items);
        setTotal(payload.total ?? payload.items.length);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [d.drill, d.audience, audienceFilter, city, page, q, loadDrill, showUserFilters]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        onClick={() => ops.openDrill(null)}
      >
        <ArrowLeft className="size-4" /> Back to Operations
      </button>

      <Section
        title={d.title}
        description={loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
      >
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder={
                d.drill === "failed_notifications" ? "Search message…" : "Search name, phone, email…"
              }
              aria-label="Search records"
              className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {showUserFilters && d.drill !== "people_registered" ? (
            <div className="flex rounded-md border p-0.5" role="group" aria-label="Audience">
              {(
                [
                  ["all", "All"],
                  ["b2b", "B2B"],
                  ["b2c", "B2C"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setAudienceFilter(id);
                  }}
                  className={
                    audienceFilter === id
                      ? "rounded px-2 py-0.5 text-xs font-medium bg-muted"
                      : "rounded px-2 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {showUserFilters ? (
            <input
              value={city}
              onChange={(e) => {
                setPage(1);
                setCity(e.target.value);
              }}
              placeholder="City"
              aria-label="Filter by city"
              className="h-8 w-36 rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          ) : null}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState title="No rows in this view" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const clickable = isUserRow(row) || isCampRow(row);
                  return (
                    <tr
                      key={idx}
                      className={
                        clickable
                          ? "cursor-pointer border-b last:border-0 hover:bg-muted/40"
                          : "border-b last:border-0 hover:bg-muted/40"
                      }
                      onClick={() => {
                        if (isUserRow(row)) {
                          setDrawerUserId(row.user_id as number);
                          setDrawerEngagementId(
                            typeof row.engagement_id === "number" ? row.engagement_id : null,
                          );
                          return;
                        }
                        if (typeof row.engagement_code === "string" && row.engagement_code) {
                          navigate(`/engagements/${encodeURIComponent(row.engagement_code)}`);
                        } else if (typeof row.engagement_id === "number" && isCampRow(row)) {
                          navigate(`/engagements/${row.engagement_id}`);
                        }
                      }}
                    >
                      {cols.map((c) => (
                        <td key={c.key} className="px-3 py-2.5 align-middle">
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-md border px-2 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                className="rounded-md border px-2 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Section>

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
