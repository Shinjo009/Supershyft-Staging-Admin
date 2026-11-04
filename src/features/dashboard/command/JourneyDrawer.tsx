import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getApiError, participantJourneyApi } from "../../../lib/api";
import { StatusBadge } from "./bits";

function Block({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function JourneyDrawer({
  userId,
  engagementId,
  onClose,
}: {
  userId: number | null;
  engagementId?: number | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [userName, setUserName] = useState("User");
  const [phone, setPhone] = useState<string>("—");
  const [email, setEmail] = useState<string>("—");

  useEffect(() => {
    if (userId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void Promise.all([
      participantJourneyApi.pageBootstrap(userId),
      participantJourneyApi.overview(userId),
    ])
      .then(([boot, overview]) => {
        if (cancelled) return;
        const u = boot.data.data.user;
        setUserName(
          [u.first_name, u.last_name].filter(Boolean).join(" ") || `User #${userId}`,
        );
        setPhone(u.phone || "—");
        setEmail(u.email || "—");
        setData(overview.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (userId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userId, onClose]);

  if (userId == null) return null;

  const engagements = Array.isArray(data?.engagements)
    ? (data.engagements as Record<string, unknown>[])
    : [];
  const preferred =
    engagementId != null
      ? engagements.find((e) => e.engagement_id === engagementId)
      : undefined;
  const first = preferred ?? engagements[0] ?? {};
  const blood = Array.isArray(first.blood_bookings)
    ? (first.blood_bookings as Record<string, unknown>[])
    : [];
  const payments = Array.isArray(first.payments)
    ? (first.payments as Record<string, unknown>[])
    : Array.isArray((data?.account as Record<string, unknown> | undefined)?.payments)
      ? (((data?.account as Record<string, unknown>).payments as Record<string, unknown>[]) ?? [])
      : [];
  const notifications = Array.isArray(first.notifications)
    ? (first.notifications as Record<string, unknown>[])
    : Array.isArray((data?.account as Record<string, unknown> | undefined)?.notifications)
      ? (((data?.account as Record<string, unknown>).notifications as Record<string, unknown>[]) ??
        [])
      : [];
  const assessments = Array.isArray(first.assessments)
    ? (first.assessments as Record<string, unknown>[])
    : [];
  const consultations = Array.isArray(first.consultations)
    ? (first.consultations as Record<string, unknown>[])
    : [];
  const reports = Array.isArray(first.reports) ? (first.reports as Record<string, unknown>[]) : [];

  const engId =
    engagementId ??
    (typeof first.engagement_id === "number" ? first.engagement_id : null);

  const panel = (
    <div className="fixed inset-0 z-[100] flex justify-end bg-zinc-900/30">
      <button type="button" className="flex-1 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-200 bg-zinc-50 shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-500">Health journey</div>
            <h2 className="truncate text-lg font-semibold text-zinc-900">{userName}</h2>
            <p className="text-xs text-zinc-500">
              {typeof first.engagement_code === "string" ? first.engagement_code : "B2C booking"}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-100/80 px-3 py-2.5 text-xs">
            <div>
              <div className="text-zinc-500">Phone</div>
              <div className="font-medium text-zinc-800">{phone}</div>
            </div>
            <div>
              <div className="text-zinc-500">Email</div>
              <div className="font-medium break-all text-zinc-800">{email}</div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-500">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <>
              <Block title="Health journey">
                <ol className="space-y-2 text-sm">
                  {[
                    { label: "Registered", ok: true },
                    {
                      label: "Questionnaire",
                      ok: assessments.some(
                        (a) => a.status === "completed" || a.completed_at || a.metsights_record_id,
                      ),
                    },
                    {
                      label: "Collection",
                      ok: blood.some((b) => b.collected_at),
                    },
                    {
                      label: "Lab report",
                      ok: blood.some(
                        (b) => typeof b.diagnostic_report_url === "string" && b.diagnostic_report_url,
                      ),
                    },
                    {
                      label: "Bio-AI report",
                      ok: reports.length > 0,
                    },
                    {
                      label: "Consultation",
                      ok: consultations.some((c) => c.done === true),
                    },
                  ].map((step) => (
                    <li key={step.label} className="flex items-center justify-between gap-2">
                      <span className="text-zinc-700">{step.label}</span>
                      <StatusBadge status={step.ok ? "completed" : "pending"} />
                    </li>
                  ))}
                </ol>
              </Block>

              <Block
                title="Collection"
                action={
                  engId ? (
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white"
                      onClick={() => {
                        navigate(`/engagements/${engId}/console`);
                      }}
                    >
                      Assign slot
                    </button>
                  ) : null
                }
              >
                {blood.length === 0 ? (
                  <p className="text-sm text-zinc-500">No blood bookings</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 text-sm">
                    {blood.slice(0, 5).map((b, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2">
                        <span className="text-zinc-700">
                          {String(b.collection_date ?? "—")} · {String(b.collection_time ?? "")}
                        </span>
                        <StatusBadge
                          status={
                            b.collected_at
                              ? "collected"
                              : b.collection_date
                                ? "scheduled"
                                : "not_scheduled"
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Block>

              <Block title="Payment">
                {payments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No payment records</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 text-sm">
                    {payments.slice(0, 5).map((p, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2">
                        <span className="truncate text-zinc-700">
                          {String(p.entity_name ?? p.booking_id ?? "Booking")}
                        </span>
                        <StatusBadge status={String(p.status ?? "pending")} />
                      </li>
                    ))}
                  </ul>
                )}
              </Block>

              <Block title={`Notifications (${notifications.length})`}>
                {notifications.length === 0 ? (
                  <p className="text-sm text-zinc-500">No notifications</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 text-sm">
                    {notifications.slice(0, 8).map((n, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 py-2">
                        <span className="truncate text-zinc-700">
                          {String(n.service_key ?? n.channel ?? "Notification")}
                        </span>
                        <StatusBadge status={String(n.status ?? "pending")} />
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  return createPortal(panel, document.body);
}
