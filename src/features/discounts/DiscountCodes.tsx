import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, Tag } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { Modal } from "../../shared/ui/Modal";
import {
  discountsApi,
  diagnosticPackagesApi,
  type DiscountCode,
  type DiscountCodeCreate,
  type DiscountRedemption,
  type DiscountType,
  getApiError,
} from "../../lib/api";

const STATUS_OPTIONS = ["draft", "active", "paused", "disabled", "expired", "finished"];
const TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed_amount", label: "Fixed amount off" },
  { value: "percentage_capped", label: "% off up to a limit" },
  { value: "fixed_final_price", label: "Fixed final price" },
];
const SEARCH_DEBOUNCE_MS = 300;

type ModalMode = "add" | "edit";

const emptyForm = (): DiscountCodeCreate => ({
  code: "",
  name: "",
  discount_type: "percentage",
  percent_off: 10,
  amount_off_paise: null,
  max_discount_paise: null,
  fixed_final_price_paise: null,
  scope_mode: "all",
  package_ids: [],
  group_ids: [],
  excluded_package_ids: [],
  engagement_ids: [],
  min_bill_paise: null,
  starts_at: null,
  ends_at: null,
  total_use_limit: null,
  per_user_use_limit: 1,
  stackable: false,
});

function paiseToRupeeInput(paise: number | null | undefined): string {
  if (paise == null) return "";
  return String(paise / 100);
}

function rupeeInputToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function DiscountCodes() {
  const [tab, setTab] = useState<"codes" | "support">("codes");
  const [data, setData] = useState<DiscountCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selected, setSelected] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<DiscountCodeCreate>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const [packages, setPackages] = useState<{ id: number; name: string }[]>([]);
  const [packageFilter, setPackageFilter] = useState("");
  const [redemptionsOpen, setRedemptionsOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<DiscountRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  const [explainCode, setExplainCode] = useState("");
  const [explainPackageId, setExplainPackageId] = useState<number | "">("");
  const [explainResult, setExplainResult] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await diagnosticPackagesApi.list({ include_inactive: false });
        setPackages(
          (res.data.data || []).map((p) => ({
            id: p.diagnostic_package_id,
            name: p.package_name,
          }))
        );
      } catch {
        /* optional for form */
      }
    })();
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await discountsApi.list({
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        sort_by: "discount_code_id",
        sort_dir: "desc",
      });
      setData(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openAdd = () => {
    setModalMode("add");
    setSelected(null);
    setForm(emptyForm());
    setPackageFilter("");
    setModalOpen(true);
  };

  const openEdit = (row: DiscountCode) => {
    setModalMode("edit");
    setSelected(row);
    setPackageFilter("");
    setForm({
      code: row.code,
      name: row.name,
      discount_type: row.discount_type as DiscountType,
      percent_off: row.percent_off ?? null,
      amount_off_paise: row.amount_off_paise ?? null,
      max_discount_paise: row.max_discount_paise ?? null,
      fixed_final_price_paise: row.fixed_final_price_paise ?? null,
      scope_mode: (row.scope_mode as "all" | "selected") || "all",
      package_ids: row.package_ids || [],
      group_ids: row.group_ids || [],
      excluded_package_ids: row.excluded_package_ids || [],
      engagement_ids: row.engagement_ids || [],
      min_bill_paise: row.min_bill_paise ?? null,
      starts_at: row.starts_at ?? null,
      ends_at: row.ends_at ?? null,
      total_use_limit: row.total_use_limit ?? null,
      per_user_use_limit: row.per_user_use_limit ?? null,
      stackable: row.stackable,
    });
    setModalOpen(true);
  };

  const togglePackageId = (id: number) => {
    setForm((p) => {
      const set = new Set(p.package_ids || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, package_ids: Array.from(set) };
    });
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(packageFilter.trim().toLowerCase())
  );
  const selectedPackageIds = form.package_ids || [];
  const allFilteredSelected =
    filteredPackages.length > 0 && filteredPackages.every((p) => selectedPackageIds.includes(p.id));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (modalMode === "add") {
        await discountsApi.create(form);
      } else if (selected) {
        const { code: _code, ...rest } = form;
        await discountsApi.update(selected.discount_code_id, rest);
      }
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (row: DiscountCode, status: string) => {
    setError(null);
    try {
      await discountsApi.updateStatus(row.discount_code_id, status);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const openRedemptions = async (row: DiscountCode) => {
    setSelected(row);
    setRedemptionsOpen(true);
    setRedemptionsLoading(true);
    try {
      const res = await discountsApi.redemptions(row.discount_code_id, { page: 1, limit: 50 });
      setRedemptions(res.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setRedemptionsLoading(false);
    }
  };

  const runExplain = async () => {
    if (!explainCode.trim() || !explainPackageId) return;
    setExplainLoading(true);
    setExplainResult(null);
    try {
      const res = await discountsApi.explain({
        code: explainCode.trim(),
        items: [{ entity_type: "diagnostic_package", entity_id: Number(explainPackageId) }],
      });
      const d = res.data.data;
      setExplainResult(
        d.ok
          ? `OK — discount ${formatPaise(d.discount_paise || 0)}, GST ${formatPaise(d.gst_paise || 0)}, total ${formatPaise(d.total_paise || 0)}`
          : `Fail — ${d.message}${(d.reasons || []).length ? ` (${d.reasons!.join("; ")})` : ""}`
      );
    } catch (err) {
      setExplainResult(getApiError(err));
    } finally {
      setExplainLoading(false);
    }
  };

  const columns: Column<DiscountCode>[] = [
    { key: "code", label: "Code", render: (row) => <span className="font-mono font-medium">{row.code}</span> },
    { key: "name", label: "Name", render: (row) => row.name },
    {
      key: "discount_type",
      label: "Type",
      render: (row) => TYPE_OPTIONS.find((t) => t.value === row.discount_type)?.label || row.discount_type,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">{row.status}</span>
          {row.effective_status !== row.status && (
            <span className="text-zinc-400">→ {row.effective_status}</span>
          )}
        </span>
      ),
    },
    {
      key: "uses",
      label: "Uses",
      render: (row) =>
        `${row.consumed_count + row.reserved_count}${row.total_use_limit != null ? ` / ${row.total_use_limit}` : ""}`,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Tag className="h-5 w-5" /> Discounts
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage coupon codes for diagnostic packages</p>
        </div>
        {tab === "codes" && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" /> Add code
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-zinc-200">
        {(["codes", "support"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500"
            }`}
          >
            {t === "codes" ? "Codes" : "Support lookup"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {tab === "support" ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 max-w-xl">
          <p className="text-sm text-zinc-600">Check why a code would or would not apply for a package.</p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Code</label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={explainCode}
              onChange={(e) => setExplainCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Package</label>
            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={explainPackageId}
              onChange={(e) => setExplainPackageId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select package</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={explainLoading}
            onClick={() => void runExplain()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {explainLoading ? "Checking…" : "Explain"}
          </button>
          {explainResult && <p className="text-sm text-zinc-800 whitespace-pre-wrap">{explainResult}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                className="pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm w-64"
                placeholder="Search code or name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={data}
                keyExtractor={(r) => r.discount_code_id}
                onEdit={openEdit}
                renderExtraMenuItems={(row, closeMenu) => (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void openRedemptions(row);
                        closeMenu();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Uses log
                    </button>
                    {(row.status === "draft" || row.status === "paused") && (
                      <button
                        type="button"
                        onClick={() => {
                          void setStatus(row, "active");
                          closeMenu();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Activate
                      </button>
                    )}
                    {row.status === "active" && (
                      <button
                        type="button"
                        onClick={() => {
                          void setStatus(row, "paused");
                          closeMenu();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Pause
                      </button>
                    )}
                    {row.status !== "disabled" && (
                      <button
                        type="button"
                        onClick={() => {
                          void setStatus(row, "disabled");
                          closeMenu();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Disable
                      </button>
                    )}
                  </>
                )}
                pagination={{
                  page,
                  limit,
                  total,
                  onPageChange: setPage,
                }}
              />
            )}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "add" ? "Add discount code" : `Edit ${selected?.code || ""}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {modalMode === "add" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Code</label>
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.discount_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, discount_type: e.target.value as DiscountType }))
              }
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {(form.discount_type === "percentage" || form.discount_type === "percentage_capped") && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Percent off</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={form.percent_off ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    percent_off: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          )}
          {form.discount_type === "fixed_amount" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Amount off (₹)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={paiseToRupeeInput(form.amount_off_paise)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount_off_paise: rupeeInputToPaise(e.target.value) }))
                }
              />
            </div>
          )}
          {(form.discount_type === "percentage_capped" || form.discount_type === "percentage") && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Max discount (₹){form.discount_type === "percentage" ? " — optional" : ""}
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={paiseToRupeeInput(form.max_discount_paise)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, max_discount_paise: rupeeInputToPaise(e.target.value) }))
                }
              />
            </div>
          )}
          {form.discount_type === "fixed_final_price" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Final price (₹)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={paiseToRupeeInput(form.fixed_final_price_paise)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    fixed_final_price_paise: rupeeInputToPaise(e.target.value),
                  }))
                }
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Scope</label>
            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.scope_mode}
              onChange={(e) =>
                setForm((p) => ({ ...p, scope_mode: e.target.value as "all" | "selected" }))
              }
            >
              <option value="all">All packages</option>
              <option value="selected">Selected packages</option>
            </select>
          </div>
          {form.scope_mode === "selected" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Packages</label>
              <div className="rounded-lg border border-zinc-300 overflow-hidden">
                <div className="relative border-b border-zinc-200">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="search"
                    className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
                    placeholder="Search packages…"
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100">
                  {filteredPackages.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-zinc-500">No packages match</p>
                  ) : (
                    filteredPackages.map((p) => {
                      const checked = selectedPackageIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={checked}
                            onChange={() => togglePackageId(p.id)}
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 bg-zinc-50">
                  <span className="text-xs text-zinc-500">
                    {selectedPackageIds.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-700 hover:text-zinc-900"
                      onClick={() => {
                        if (allFilteredSelected) {
                          const filteredIds = new Set(filteredPackages.map((p) => p.id));
                          setForm((prev) => ({
                            ...prev,
                            package_ids: (prev.package_ids || []).filter((id) => !filteredIds.has(id)),
                          }));
                        } else {
                          setForm((prev) => {
                            const set = new Set(prev.package_ids || []);
                            for (const p of filteredPackages) set.add(p.id);
                            return { ...prev, package_ids: Array.from(set) };
                          });
                        }
                      }}
                    >
                      {allFilteredSelected ? "Deselect all" : "Select all"}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-700 hover:text-zinc-900"
                      onClick={() => setForm((prev) => ({ ...prev, package_ids: [] }))}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Min bill (₹)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={paiseToRupeeInput(form.min_bill_paise)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, min_bill_paise: rupeeInputToPaise(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Total use limit</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={form.total_use_limit ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    total_use_limit: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Per-user limit</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={form.per_user_use_limit ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    per_user_use_limit: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Starts at</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={form.starts_at ? form.starts_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Ends at</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={form.ends_at ? form.ends_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={redemptionsOpen}
        onClose={() => setRedemptionsOpen(false)}
        title={`Uses — ${selected?.code || ""}`}
      >
        {redemptionsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : redemptions.length === 0 ? (
          <p className="text-sm text-zinc-500">No redemptions yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {redemptions.map((r) => (
              <div key={r.redemption_id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{r.status}</span>
                  <span className="text-zinc-500">user {r.user_id}</span>
                </div>
                <div className="text-zinc-600 mt-1">
                  {formatPaise(r.subtotal_paise)} → −{formatPaise(r.discount_paise)} + GST{" "}
                  {formatPaise(r.gst_paise)} = {formatPaise(r.total_paise)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
