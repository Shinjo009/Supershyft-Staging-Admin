export type WizardStep = { key: string; label: string };

type WizardStepIndicatorProps = {
  steps: WizardStep[];
  stepIndex: number;
  onGoToStep?: (index: number) => void;
};

export function WizardStepIndicator({ steps, stepIndex, onGoToStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1">
      {steps.map((item, index) => {
        const active = stepIndex === index;
        const done = stepIndex > index;
        return (
          <div key={item.key} className="flex items-center gap-2 flex-1 min-w-[5.5rem] shrink-0 sm:shrink sm:min-w-0">
            <button
              type="button"
              disabled={!done && !active}
              onClick={() => done && onGoToStep?.(index)}
              title={item.label}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : done
                    ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 cursor-pointer"
                    : "bg-zinc-100 text-zinc-400 cursor-default"
              }`}
            >
              {index + 1}
            </button>
            <span
              title={item.label}
              className={`text-xs font-medium truncate ${
                active ? "text-zinc-900" : done ? "text-zinc-700" : "text-zinc-500"
              }`}
            >
              {item.label}
            </span>
            {index < steps.length - 1 && (
              <div className="hidden sm:block flex-1 h-px bg-zinc-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}
