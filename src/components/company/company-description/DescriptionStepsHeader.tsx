import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DescriptionStepsHeaderProps {
  currentStep: 1 | 2;
}

export function DescriptionStepsHeader({ currentStep }: DescriptionStepsHeaderProps) {
  return (
    <div className="mb-8 flex items-center gap-0 sm:gap-4">
      <StepDot n={1} label="Présentation" active={currentStep === 1} done={currentStep > 1} />
      <div className="mx-2 hidden h-px w-10 shrink-0 bg-slate-200 sm:block" aria-hidden />
      <StepDot n={2} label="Synthèse" active={currentStep === 2} done={false} />
    </div>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: 1 | 2;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
          done
            ? 'bg-emerald-600 text-white'
            : active
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-400',
        )}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
      </div>
      <span
        className={cn(
          'text-sm font-medium tracking-tight',
          active ? 'text-slate-900' : done ? 'text-emerald-800' : 'text-slate-400',
        )}
      >
        {label}
      </span>
    </div>
  );
}
