import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: CardProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-slate-900', className)} {...rest}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...rest }: CardProps) {
  return (
    <p className={cn('text-sm text-slate-600', className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('space-y-4', className)} {...rest}>
      {children}
    </div>
  );
}
