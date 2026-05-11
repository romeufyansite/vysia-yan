import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-[3.25rem] min-h-[3.25rem] w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-2 text-[15px] text-slate-900 transition-[border-color,box-shadow,background-color,color] placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus-visible:border-blue-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:text-foreground file:font-medium md:text-[15px]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
