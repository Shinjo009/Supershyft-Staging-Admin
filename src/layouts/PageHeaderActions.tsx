import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Info, type LucideIcon } from "lucide-react";

const MIN_TITLE_PX = 96;
const EXPAND_SPARE_PX = 32;

type PageHeaderContextValue = {
  slot: HTMLDivElement | null;
  setSlot: (node: HTMLDivElement | null) => void;
  headerRef: RefObject<HTMLElement | null>;
  titleRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
  compact: boolean;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotEl] = useState<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  const setSlot = useCallback((node: HTMLDivElement | null) => {
    if (slotRef.current === node) return;
    slotRef.current = node;
    setSlotEl(node);
  }, []);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const right = rightRef.current;
    if (!slot || !header || !right) return;

    let compactNow = false;
    let expandedWidth = 0;
    let frame = 0;

    const availableForRight = () => {
      const cs = getComputedStyle(header);
      const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const gap = parseFloat(cs.columnGap || cs.gap) || 0;
      const menu = header.querySelector<HTMLElement>("[data-header-menu]");
      const menuVisible = !!menu && getComputedStyle(menu).display !== "none" && menu.offsetWidth > 0;
      const menuW = menuVisible ? menu.offsetWidth : 0;
      const gaps = menuVisible ? gap * 2 : gap;
      return header.clientWidth - pad - menuW - gaps - MIN_TITLE_PX;
    };

    const apply = (next: boolean) => {
      if (compactNow === next) return;
      compactNow = next;
      setCompact(next);
    };

    const measure = () => {
      const available = availableForRight();
      if (!compactNow) {
        expandedWidth = right.scrollWidth;
        apply(expandedWidth > available + 1);
      } else if (expandedWidth > 0 && available >= expandedWidth + EXPAND_SPARE_PX) {
        apply(false);
      }
    };

    const onSlotChildrenChange = () => {
      compactNow = false;
      setCompact(false);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure());
    };

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(header);
    const mutationObserver = new MutationObserver(onSlotChildrenChange);
    mutationObserver.observe(slot, { childList: true });
    measure();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [slot]);

  const value = useMemo(
    () => ({ slot, setSlot, headerRef, titleRef, rightRef, compact }),
    [slot, setSlot, compact]
  );

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderChrome() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeaderChrome must be used within PageHeaderActionsProvider");
  }
  return ctx;
}

export function usePageHeaderCompact() {
  return useContext(PageHeaderContext)?.compact ?? false;
}

export function PageHeaderActions({ children }: { children: ReactNode }) {
  const ctx = useContext(PageHeaderContext);
  if (!ctx?.slot) return null;
  return createPortal(children, ctx.slot);
}

const actionButtonClass = (variant: "primary" | "secondary", compact: boolean) =>
  `inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium shrink-0 transition-colors ${
    compact ? "w-8" : "px-2.5"
  } ${
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;

export function HeaderActionButton({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
  disabled = false,
  iconOnly = false,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const compact = usePageHeaderCompact() || iconOnly;
  return (
    <span className="relative group/action shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`${actionButtonClass(variant, compact)} disabled:opacity-50`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className={compact ? "sr-only" : "whitespace-nowrap"}>{label}</span>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-normal text-white shadow-lg transition-opacity ${
          compact ? "opacity-0 group-hover/action:opacity-100" : "hidden"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

export function HeaderInfoButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative group/info shrink-0">
      <button
        type="button"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        aria-label={label}
      >
        <Info className="w-4 h-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
