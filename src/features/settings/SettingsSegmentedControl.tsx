type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SettingsSegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SettingsSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: SettingsSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-nowrap rounded-lg border border-zinc-200 p-0.5 bg-white"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${
              active
                ? "bg-zinc-900 text-white"
                : "bg-transparent text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export type YesNoValue = (typeof YES_NO_OPTIONS)[number]["value"];

export function boolToYesNo(value: boolean): YesNoValue {
  return value ? "yes" : "no";
}

export function yesNoToBool(value: YesNoValue): boolean {
  return value === "yes";
}
