import { useId, useRef, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A password field that can be read back.
 *
 * Worth having rather than a nicety: the people signing into this are typing on
 * a phone or a shared office keyboard, often a password somebody else set for
 * them, and a mistyped character is invisible. Without a way to check, the only
 * feedback is a failed sign-in that looks identical to a wrong account.
 *
 * Hidden by default, and it re-hides on blur — a password left revealed on an
 * unattended screen in a shared office is exactly what the masking is for. The
 * toggle is a real button so it is reachable by keyboard, but sits outside the
 * tab order between the field and the submit button, where an extra stop would
 * only be in the way.
 */
export function PasswordInput({
  className,
  id,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { showLabel?: string; hideLabel?: string }) {
  const [visible, setVisible] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="relative">
      <Input
        {...props}
        ref={field}
        id={fieldId}
        type={visible ? 'text' : 'password'}
        // Room for the button, on whichever side the language puts it.
        className={cn('pe-10', className)}
        onBlur={(event) => {
          setVisible(false);
          props.onBlur?.(event);
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        /*
         * Keep the focus in the field.
         *
         * Without this the button's mousedown blurs the input, the re-hide
         * below fires, and the toggle cancels itself out — so clicking the eye
         * did nothing in the one case that matters, which is somebody who has
         * just typed their password and wants to check it. Holding the focus
         * also preserves the caret, so typing continues where it left off.
         */
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setVisible((current) => !current);
          // Put the caret in the field whether or not it was already there.
          // Revealing is nearly always followed by typing, and it also means
          // the re-hide below has something to fire from — without it, a
          // password revealed from a cold field stayed on screen after the
          // person walked away, which is the whole thing masking is for.
          field.current?.focus();
        }}
        aria-controls={fieldId}
        aria-pressed={visible}
        aria-label={visible ? hideLabel : showLabel}
        title={visible ? hideLabel : showLabel}
        className={cn(
          'absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-e-md',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
