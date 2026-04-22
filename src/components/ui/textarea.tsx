import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-base text-foreground',
          'placeholder:text-muted-foreground/70',
          'focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none focus-visible:bg-surface-container-highest',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'caret-primary',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
