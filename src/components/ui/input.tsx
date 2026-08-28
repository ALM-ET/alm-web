import { forwardRef, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Forwards its ref, because a couple of wrappers need to drive the element
 * itself — the password toggle has to put the caret back in the field.
 */
export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
        className,
      )}
      {...props}
    />
  );
});
