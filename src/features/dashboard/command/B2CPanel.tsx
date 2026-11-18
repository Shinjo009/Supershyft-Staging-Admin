import type { CommandPeriodParams } from "../../../lib/api";
import { B2CGrid } from "./B2CGrid";
import { B2CUsersDetail } from "./B2CUsersDetail";
import { B2CUsersTab } from "./B2CUsersTab";
import type { B2CSubTab, CardId } from "./period";
import { cardInteraction } from "./period";

export function B2CPanel({
  subTab,
  card,
  packageId,
  discountCodeId,
  periodParams,
  onSubTabChange,
  onOpenCard,
  onOpenPackage,
  onOpenCoupon,
  onBack,
}: {
  subTab: B2CSubTab;
  card: CardId | null;
  packageId: number | null;
  discountCodeId: number | null;
  periodParams: CommandPeriodParams;
  onSubTabChange: (sub: B2CSubTab) => void;
  onOpenCard: (id: CardId) => void;
  onOpenPackage: (packageId: number) => void;
  onOpenCoupon: (discountCodeId: number) => void;
  onBack: () => void;
}) {
  const interaction = cardInteraction(card, "b2c");
  const showDetail = Boolean(card && interaction === "new_page");
  const showSubTabs = !showDetail;

  return (
    <div className="space-y-4" data-testid="b2c-panel">
      {showSubTabs ? (
        <div
          className="flex flex-wrap gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5"
          role="tablist"
          aria-label="B2C sub tabs"
        >
          {(
            [
              ["overview", "Overview"],
              ["users", "Users"],
            ] as const
          ).map(([id, label]) => {
            const active = subTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSubTabChange(id)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
                data-testid={`b2c-subtab-${id}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {showDetail && card ? (
        <B2CUsersDetail
          card={card}
          periodParams={periodParams}
          packageId={packageId}
          discountCodeId={discountCodeId}
          onBack={onBack}
        />
      ) : subTab === "users" ? (
        <B2CUsersTab />
      ) : (
        <B2CGrid
          periodParams={periodParams}
          onOpenCard={onOpenCard}
          onOpenPackage={onOpenPackage}
          onOpenCoupon={onOpenCoupon}
        />
      )}
    </div>
  );
}
