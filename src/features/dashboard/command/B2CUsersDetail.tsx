import { useEffect, useState } from "react";
import {
  commandDashboardApi,
  getApiError,
  type CommandB2CUserRow,
  type CommandPeriodParams,
} from "../../../lib/api";
import { B2CUserTable } from "./B2CUserTable";
import { DetailPageHeader, useDebouncedDetailSearch } from "./DetailPageHeader";
import type { CardId } from "./period";

type FetchKind =
  | "total_bookings"
  | "collection_tomorrow"
  | "tests_completed"
  | "lab_report_delivered"
  | "bio_ai_reports"
  | "consultation_done"
  | "package_performance"
  | "coupon_usage";

const TITLES: Record<FetchKind, string> = {
  total_bookings: "Total bookings",
  collection_tomorrow: "Collection tomorrow",
  tests_completed: "Tests completed",
  lab_report_delivered: "Lab report delivered",
  bio_ai_reports: "Bio-AI reports generated",
  consultation_done: "Consultation done",
  package_performance: "Package performance",
  coupon_usage: "Coupon usage",
};

const EMPTY: Record<FetchKind, string> = {
  total_bookings: "No B2C bookings in this period.",
  collection_tomorrow: "No collections scheduled for tomorrow.",
  tests_completed: "No completed tests in this period.",
  lab_report_delivered: "No lab reports delivered in this period.",
  bio_ai_reports: "No Bio-AI reports in this period.",
  consultation_done: "No consultations done in this period.",
  package_performance: "No users for this package in this period.",
  coupon_usage: "No users for this coupon in this period.",
};

function kindFromCard(card: CardId): FetchKind | null {
  if (
    card === "total_bookings" ||
    card === "collection_tomorrow" ||
    card === "tests_completed" ||
    card === "lab_report_delivered" ||
    card === "bio_ai_reports" ||
    card === "consultation_done" ||
    card === "package_performance" ||
    card === "coupon_usage"
  ) {
    return card;
  }
  return null;
}

export function B2CUsersDetail({
  card,
  periodParams,
  packageId,
  discountCodeId,
  onBack,
}: {
  card: CardId;
  periodParams: CommandPeriodParams;
  packageId?: number | null;
  discountCodeId?: number | null;
  onBack: () => void;
}) {
  const kind = kindFromCard(card);
  const [rows, setRows] = useState<CommandB2CUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedDetailSearch(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [card, packageId, discountCodeId, periodParams.period, periodParams.from, periodParams.to]);

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {
      ...periodParams,
      page,
      limit,
      include_rows: true as const,
      search: debouncedSearch || undefined,
    };

    const fetchPromise = (() => {
      switch (kind) {
        case "total_bookings":
          return commandDashboardApi.b2cTotalBookings(params);
        case "collection_tomorrow":
          return commandDashboardApi.b2cCollectionTomorrow(params);
        case "tests_completed":
          return commandDashboardApi.b2cTestsCompleted(params);
        case "lab_report_delivered":
          return commandDashboardApi.b2cLabReportDelivered(params);
        case "bio_ai_reports":
          return commandDashboardApi.b2cBioAiReports(params);
        case "consultation_done":
          return commandDashboardApi.b2cConsultationDone(params);
        case "package_performance":
          if (!packageId) {
            return Promise.resolve({
              data: { data: [] as CommandB2CUserRow[], meta: { total: 0 } },
            });
          }
          return commandDashboardApi.b2cPackageUsers({
            ...params,
            package_id: packageId,
          });
        case "coupon_usage":
          if (!discountCodeId) {
            return Promise.resolve({
              data: { data: [] as CommandB2CUserRow[], meta: { total: 0 } },
            });
          }
          return commandDashboardApi.b2cCouponUsers({
            ...params,
            discount_code_id: discountCodeId,
          });
        default:
          return Promise.resolve({
            data: { data: [] as CommandB2CUserRow[], meta: { total: 0 } },
          });
      }
    })();

    fetchPromise
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
  }, [
    kind,
    page,
    packageId,
    discountCodeId,
    periodParams.period,
    periodParams.from,
    periodParams.to,
    debouncedSearch,
  ]);

  if (!kind) return null;

  const pages = Math.max(1, Math.ceil(total / limit));
  const title = TITLES[kind];

  return (
    <div className="space-y-3" data-testid={`b2c-detail-${kind}`}>
      <DetailPageHeader
        title={title}
        total={total}
        onBack={onBack}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <B2CUserTable
        rows={rows}
        loading={loading}
        error={error}
        emptyLabel={EMPTY[kind]}
        total={total}
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        testId={`b2c-detail-table-${kind}`}
      />
    </div>
  );
}
