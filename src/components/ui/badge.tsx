import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Chips / technical tags. Sharp corners, label-tech typography, no
 * background glow. Cyan for categories, hazard orange for status
 * warnings, lime for confirmation.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 border px-2 py-0.5 label-tech',
  {
    variants: {
      variant: {
        default: 'border-primary/60 bg-primary/10 text-primary',
        tech: 'border-tertiary/60 bg-tertiary/10 text-tertiary',
        hazard: 'border-secondary/70 bg-secondary/10 text-secondary',
        outline: 'border-outline-variant text-on-surface-variant',
        soft: 'border-transparent bg-primary-soft text-primary',
        success: 'border-primary bg-primary text-primary-foreground',
        warning: 'border-secondary bg-secondary text-secondary-foreground',
        destructive: 'border-destructive bg-destructive/20 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
