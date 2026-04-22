import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons — industrial, sharp, heavy-bordered. Default variant is a
 * solid lime fill with dark text (maximum impact). `outline` is the
 * terminal-style hollow button. Hover states offset the border 2px to
 * evoke a glitch / hardware-feedback moment.
 */
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-display text-sm font-bold uppercase tracking-wider transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border-2 border-primary bg-primary text-primary-foreground hover:bg-primary-hover hover:border-primary-hover hover:shadow-glow',
        outline:
          'border-2 border-primary bg-transparent text-primary hover:bg-primary/10',
        secondary:
          'border-2 border-secondary bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:border-secondary-hover',
        tertiary:
          'border-2 border-tertiary bg-transparent text-tertiary hover:bg-tertiary/10',
        ghost:
          'border-2 border-transparent bg-transparent text-foreground hover:bg-surface-container-high hover:border-outline-variant',
        destructive:
          'border-2 border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30',
        link:
          'border-0 bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
