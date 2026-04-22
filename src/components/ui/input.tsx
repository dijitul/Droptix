import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Industrial input — flat charcoal surface with a 1px cyan bottom border
 * that thickens to 2px on focus. No corner radius. Monospace caret.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-base text-foreground',
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
Input.displayName = 'Input';

export { Input };
