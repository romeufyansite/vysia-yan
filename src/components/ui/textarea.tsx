import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[7.5rem] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3.5 text-[15px] text-slate-900 shadow-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus-visible:border-blue-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
