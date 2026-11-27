import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

export function DetailPageHeader({
  title,
  total,
  onBack,
  search,
  onSearchChange,
  searchPlaceholder = "Search by name or phone…",
  showTotal = true,
}: {
  title: string;
  total?: number;
  onBack: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showTotal?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </button>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {showTotal && total != null ? (
        <span className="text-sm text-zinc-500">({total})</span>
      ) : null}
      <div className="relative ml-auto w-full sm:w-64 min-w-[12rem]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-zinc-300 py-1.5 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-900"
          aria-label={searchPlaceholder}
        />
      </div>
    </div>
  );
}

/** Debounce a detail-page search string (~300ms, same as /users). */
export function useDebouncedDetailSearch(search: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  return debouncedSearch;
}
