import { cn } from '@/lib/utils';

interface ConnectScreenStepHeaderProps {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  className?: string;
}

export function ConnectScreenStepHeader({
  step,
  title,
  description,
  className,
}: ConnectScreenStepHeaderProps) {
  return (
    <header className={cn('mb-8 text-center', className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
        Étape {step}
      </p>
      <h3 className="text-balance text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-slate-500 sm:text-[15px]">
        {description}
      </p>
    </header>
  );
}
