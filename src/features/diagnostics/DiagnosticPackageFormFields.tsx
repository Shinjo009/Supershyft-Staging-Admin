import { useState, type ComponentType, type ReactNode } from "react";
import {
  ChevronDown,
  FileText,
  FlaskConical,
  Package,
  Tag,
  UploadCloud,
  Users,
} from "lucide-react";
import type { ExpertTypeItem } from "../../lib/api";
import {
  diagnosticProviderDisplayLabel,
  isOrangeHealthProvider,
} from "./providerParameterKeys";
import { toNumberOrNull, type PackageFormState } from "./diagnosticPackageFormData";

type Props = {
  form: PackageFormState;
  setForm: React.Dispatch<React.SetStateAction<PackageFormState>>;
  expertTypes: ExpertTypeItem[];
  imageUploading: boolean;
  onImageUpload: (file?: File) => void;
};

type SectionKey = "basic" | "lab" | "pricing" | "consultations" | "content";

function FormSection({
  sectionKey,
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  sectionKey: SectionKey;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
      data-testid={`diag-package-form-section-${sectionKey}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-zinc-50"
        aria-expanded={open}
        data-testid={`diag-package-form-section-${sectionKey}-toggle`}
      >
        <span className="inline-flex items-start gap-3 min-w-0">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0"
            data-testid={`diag-package-form-section-${sectionKey}-icon`}
          >
            <Icon className="w-4 h-4 text-blue-600" />
          </span>
          <span className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-blue-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-zinc-100 pt-4 space-y-4">{children}</div> : null}
    </section>
  );
}

export function DiagnosticPackageFormFields({
  form,
  setForm,
  expertTypes,
  imageUploading,
  onImageUpload,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    lab: true,
    pricing: true,
    consultations: true,
    content: true,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const basicFields = (
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
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-zinc-700 mb-1">Upload package image</label>
        <label
          className={`flex items-center justify-center gap-2 w-full border border-dashed border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-zinc-50 hover:bg-zinc-100 cursor-pointer ${
            imageUploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <UploadCloud className="w-4 h-4 text-blue-600" />
          <span>{imageUploading ? "Uploading…" : "Upload package image"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onImageUpload(e.target.files?.[0])}
            className="sr-only"
            disabled={imageUploading}
          />
        </label>
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
          onChange={(e) =>
            setForm((prev) => ({ ...prev, package_for: e.target.value as "public" | "camp" | "both" }))
          }
          className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-zinc-900"
        >
          <option value="public">B2C</option>
          <option value="camp">B2B</option>
          <option value="both">both</option>
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
  );

  const labFields = (
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
          <option value="redcliffe">Redcliffe</option>
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
  );

  const pricingFields = (
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
        <label className="block text-sm font-medium text-zinc-700 mb-1">Minimum price</label>
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
  );

  const consultationsFields = (
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
  );

  const contentFields = (
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
  );

  return (
    <div className="space-y-5" data-testid="diag-package-form-fields">
      <FormSection
        sectionKey="basic"
        title="Basic Information"
        subtitle="Package name, lab and provider details"
        icon={Package}
        open={openSections.basic}
        onToggle={() => toggleSection("basic")}
      >
        {basicFields}
      </FormSection>

      <FormSection
        sectionKey="lab"
        title="Lab"
        subtitle="Provider and lab package code"
        icon={FlaskConical}
        open={openSections.lab}
        onToggle={() => toggleSection("lab")}
      >
        {labFields}
      </FormSection>

      <FormSection
        sectionKey="pricing"
        title="Pricing"
        subtitle="Set package pricing and limits"
        icon={Tag}
        open={openSections.pricing}
        onToggle={() => toggleSection("pricing")}
      >
        {pricingFields}
      </FormSection>

      {expertTypes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FormSection
            sectionKey="consultations"
            title="Consultations"
            subtitle="Available consultation options"
            icon={Users}
            open={openSections.consultations}
            onToggle={() => toggleSection("consultations")}
          >
            {consultationsFields}
          </FormSection>
          <FormSection
            sectionKey="content"
            title="Content"
            subtitle="Package description and details"
            icon={FileText}
            open={openSections.content}
            onToggle={() => toggleSection("content")}
          >
            {contentFields}
          </FormSection>
        </div>
      ) : (
        <FormSection
          sectionKey="content"
          title="Content"
          subtitle="Package description and details"
          icon={FileText}
          open={openSections.content}
          onToggle={() => toggleSection("content")}
        >
          {contentFields}
        </FormSection>
      )}
    </div>
  );
}
