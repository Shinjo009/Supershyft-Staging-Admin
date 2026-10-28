import type { DiagnosticPackageGroupListItem, ExpertTypeItem } from "../../lib/api";
import {
  diagnosticProviderDisplayLabel,
  isOrangeHealthProvider,
} from "./providerParameterKeys";
import {
  catalogProductOptionLabel,
  toNumberOrNull,
  type CatalogGroupRosterMember,
  type PackageFormState,
} from "./diagnosticPackageFormData";

type Props = {
  form: PackageFormState;
  setForm: React.Dispatch<React.SetStateAction<PackageFormState>>;
  catalogProductOptions: DiagnosticPackageGroupListItem[];
  groupRoster: CatalogGroupRosterMember[];
  currentPackageId?: number | null;
  expertTypes: ExpertTypeItem[];
  imageUploading: boolean;
  onImageUpload: (file?: File) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

export function DiagnosticPackageFormFields({
  form,
  setForm,
  catalogProductOptions,
  groupRoster,
  currentPackageId,
  expertTypes,
  imageUploading,
  onImageUpload,
}: Props) {
  const showRoster = groupRoster.length > 1 || (form.linkMode === "linked" && groupRoster.length > 0);
  const currentGroupId =
    currentPackageId != null
      ? catalogProductOptions.find((row) =>
          Object.values(row.package_group ?? {}).includes(currentPackageId)
        )?.package_group_id
      : null;

  const joinOptions = catalogProductOptions.filter((row) => {
    if (row.diagnostic_package_id === currentPackageId) return false;
    if (currentGroupId != null && row.package_group_id === currentGroupId) return false;
    return true;
  });

  const requestSeparateProduct = () => {
    if (
      form.initialHadGroupPeers &&
      !window.confirm(
        "This lab will appear as its own product on the website. Other labs in this group will stay grouped together. Continue?"
      )
    ) {
      return;
    }
    setForm((prev) => ({ ...prev, linkMode: "own", same_as_package_id: null }));
  };

  return (
    <div className="space-y-5">
      <Section title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Package name *</label>
            <input
              type="text"
              value={form.package_name}
              onChange={(e) => setForm((prev) => ({ ...prev, package_name: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Package image URL</label>
            <input
              type="url"
              value={form.package_image ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, package_image: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
              placeholder="https://"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Upload package image</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => onImageUpload(e.target.files?.[0])}
              className="w-full text-sm"
              disabled={imageUploading}
            />
            {imageUploading && <p className="mt-1 text-xs text-zinc-500">Uploading image...</p>}
          </div>
          {form.package_image ? (
            <div className="sm:col-span-2">
              <img
                src={form.package_image}
                alt="Package preview"
                className="h-20 w-20 rounded-lg object-cover border border-zinc-200"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Collection type</label>
            <select
              value={form.collection_type ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, collection_type: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Select</option>
              <option value="home_collection">home_collection</option>
              <option value="centre_visit">centre_visit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Gender suitability</label>
            <select
              value={form.gender_suitability ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, gender_suitability: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Select</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="both">both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Package for</label>
            <select
              value={form.package_for ?? "public"}
              onChange={(e) => setForm((prev) => ({ ...prev, package_for: e.target.value as "public" | "camp" }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
            >
              <option value="public">public</option>
              <option value="camp">camp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Report duration hours</label>
            <input
              type="number"
              value={form.report_duration_hours ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, report_duration_hours: toNumberOrNull(e.target.value) }))
              }
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
      </Section>

      <Section title="Lab">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Provider</label>
            <select
              value={form.diagnostic_provider ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, diagnostic_provider: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Select</option>
              <option value="Healthians">Healthians</option>
              <option value="orange_health">Orange Health</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              {diagnosticProviderDisplayLabel(form.diagnostic_provider)} package code
            </label>
            <input
              type="text"
              value={form.external_package_code ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  external_package_code: e.target.value.trim() ? e.target.value.trim() : null,
                }))
              }
              placeholder={
                isOrangeHealthProvider(form.diagnostic_provider)
                  ? `${diagnosticProviderDisplayLabel(form.diagnostic_provider)} package_id`
                  : `${diagnosticProviderDisplayLabel(form.diagnostic_provider)} numeric package id`
              }
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
      </Section>

      <Section title="Website catalog product">
        <p className="text-xs text-zinc-600 -mt-2">
          Each lab has its own price and code. Grouped labs appear as one product to customers on the website.
        </p>
        {showRoster ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-900">Labs in this catalog product</p>
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Lab</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRoster.map((member) => (
                    <tr key={member.diagnostic_package_id} className="border-t border-zinc-100">
                      <td className="px-3 py-2 text-zinc-900">
                        {diagnosticProviderDisplayLabel(member.diagnostic_provider)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{member.external_package_code ?? "—"}</td>
                      <td className="px-3 py-2 text-zinc-900">
                        {member.price != null ? `₹${member.price}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {member.is_default_for_group ? (
                          <span className="text-xs font-medium text-zinc-700">Catalog default</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {currentPackageId ? (
              <p className="text-xs text-zinc-500">
                Use the lab bar at the top to switch and edit another lab in this product.
              </p>
            ) : null}
          </div>
        ) : null}

        {form.linkMode === "linked" ? (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Same product as…</label>
            <select
              value={form.same_as_package_id ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  linkMode: "linked",
                  same_as_package_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
              required
            >
              <option value="">Select a catalog product</option>
              {joinOptions.map((row) => (
                <option key={row.diagnostic_package_id} value={row.diagnostic_package_id}>
                  {catalogProductOptionLabel(row)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Join an existing catalog product (optional)
            </label>
            <select
              value={form.same_as_package_id ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                if (!id) {
                  setForm((prev) => ({ ...prev, linkMode: "own", same_as_package_id: null }));
                  return;
                }
                setForm((prev) => ({
                  ...prev,
                  linkMode: "linked",
                  same_as_package_id: id,
                }));
              }}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">This lab is its own product on the website</option>
              {joinOptions.map((row) => (
                <option key={row.diagnostic_package_id} value={row.diagnostic_package_id}>
                  {catalogProductOptionLabel(row)}
                </option>
              ))}
            </select>
          </div>
        )}

        {(form.linkMode === "linked" || form.initialHadGroupPeers) && (
          <button
            type="button"
            onClick={requestSeparateProduct}
            className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Show as separate product on website
          </button>
        )}
      </Section>

      <Section title="Pricing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Price</label>
            <input
              type="number"
              value={form.price ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, price: toNumberOrNull(e.target.value) }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Original price</label>
            <input
              type="number"
              value={form.original_price ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, original_price: toNumberOrNull(e.target.value) }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Minimum price (floor)</label>
            <input
              type="number"
              value={form.min_price ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, min_price: toNumberOrNull(e.target.value) }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Bookings count</label>
            <input
              type="number"
              value={form.bookings_count ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, bookings_count: toNumberOrNull(e.target.value) }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-2 self-stretch justify-center">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={!!form.is_most_popular}
                onChange={(e) => setForm((prev) => ({ ...prev, is_most_popular: e.target.checked }))}
              />
              Most popular
            </label>
          </div>
        </div>
      </Section>

      {expertTypes.length > 0 && (
        <Section title="Consultations">
          <div className="space-y-2">
            {expertTypes.map((et) => (
              <label
                key={et.type_key}
                className="flex items-center gap-2 px-3 py-3 rounded-lg border border-zinc-300 bg-zinc-50 text-sm font-medium text-zinc-900 cursor-pointer hover:bg-zinc-100"
              >
                <input
                  type="checkbox"
                  checked={!!(form.complementary_consultation ?? {})[et.type_key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      complementary_consultation: {
                        ...(prev.complementary_consultation ?? {}),
                        [et.type_key]: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                {et.type} consultation
              </label>
            ))}
          </div>
        </Section>
      )}

      <Section title="Content">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Health areas covered</label>
            <textarea
              value={form.health_areas_covered ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, health_areas_covered: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 min-h-24 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">About</label>
            <textarea
              value={form.about_text ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, about_text: e.target.value }))}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 min-h-24 focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
