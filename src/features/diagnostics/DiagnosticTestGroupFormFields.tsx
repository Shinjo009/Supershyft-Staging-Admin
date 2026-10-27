import type { TestGroupFormState } from "./diagnosticTestGroupFormData";
import { slugifyGroupKey } from "./diagnosticTestGroupFormData";

export function DiagnosticTestGroupFormFields({
  form,
  setForm,
  groupKeyManuallyEdited,
  setGroupKeyManuallyEdited,
}: {
  form: TestGroupFormState;
  setForm: React.Dispatch<React.SetStateAction<TestGroupFormState>>;
  groupKeyManuallyEdited: boolean;
  setGroupKeyManuallyEdited: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Group name</label>
        <input
          type="text"
          value={form.group_name}
          onChange={(e) => {
            const groupName = e.target.value;
            setForm((prev) => {
              const next = { ...prev, group_name: groupName };
              if (!groupKeyManuallyEdited) {
                next.group_key = slugifyGroupKey(groupName);
              }
              return next;
            });
          }}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Group key</label>
        <input
          type="text"
          value={form.group_key}
          onChange={(e) => {
            setGroupKeyManuallyEdited(true);
            setForm((prev) => ({ ...prev, group_key: e.target.value }));
          }}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Order</label>
        <input
          type="number"
          value={form.display_order}
          onChange={(e) => setForm((prev) => ({ ...prev, display_order: e.target.value }))}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Price</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Original price</label>
        <input
          type="number"
          value={form.original_price}
          onChange={(e) => setForm((prev) => ({ ...prev, original_price: e.target.value }))}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-zinc-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Gender suitability</label>
        <select
          value={form.gender_suitability}
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
          value={form.package_for}
          onChange={(e) => setForm((prev) => ({ ...prev, package_for: e.target.value as "public" | "camp" }))}
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
        >
          <option value="public">public</option>
          <option value="camp">camp</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={form.is_most_popular}
          onChange={(e) => setForm((prev) => ({ ...prev, is_most_popular: e.target.checked }))}
        />
        Most popular
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={form.has_allergy_screening}
          onChange={(e) => setForm((prev) => ({ ...prev, has_allergy_screening: e.target.checked }))}
        />
        Allergy screening
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={form.has_cancer_screening}
          onChange={(e) => setForm((prev) => ({ ...prev, has_cancer_screening: e.target.checked }))}
        />
        Cancer screening
      </label>
    </div>
  );
}
