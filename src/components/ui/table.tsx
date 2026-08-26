import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Wide tables scroll inside their own container. Letting the page body scroll
 * sideways instead breaks the sidebar and the sticky header.
 */
export function TableWrapper({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('w-full overflow-x-auto rounded-lg border border-border bg-card', className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

export function THead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-secondary/60', className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('transition-colors hover:bg-muted/40', className)} {...props} />;
}

export function TH({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-accent',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
