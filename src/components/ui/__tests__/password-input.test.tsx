import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '../password-input';

/**
 * The show/hide toggle.
 *
 * The case worth pinning down is the one that was broken: somebody has just
 * typed their password, the field has focus, and they click the eye to check
 * it. The button's mousedown blurred the input, the re-hide on blur fired, and
 * the toggle cancelled itself out — so the control did nothing in exactly the
 * situation it exists for.
 */

describe('the password toggle', () => {
  it('starts hidden', () => {
    render(<PasswordInput id="pw" defaultValue="Password123" />);
    expect(screen.getByLabelText('Show password')).toBeDefined();
    expect((document.querySelector('#pw') as HTMLInputElement).type).toBe('password');
  });

  it('reveals the password while the field still has focus', async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" defaultValue="Password123" />);

    const field = document.querySelector('#pw') as HTMLInputElement;
    await user.click(field);
    await user.click(screen.getByLabelText('Show password'));

    expect(field.type).toBe('text');
    // Focus must stay put, or the next keystroke goes nowhere and the caret
    // jumps to the end of what they have typed.
    expect(document.activeElement).toBe(field);
  });

  it('hides it again on a second click', async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" defaultValue="Password123" />);

    const field = document.querySelector('#pw') as HTMLInputElement;
    await user.click(screen.getByLabelText('Show password'));
    await user.click(screen.getByLabelText('Hide password'));

    expect(field.type).toBe('password');
  });

  it('re-hides when the person leaves the field', async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordInput id="pw" defaultValue="Password123" />
        <button type="button">Sign in</button>
      </>,
    );

    const field = document.querySelector('#pw') as HTMLInputElement;
    await user.click(screen.getByLabelText('Show password'));
    expect(field.type).toBe('text');

    // A password left revealed on an unattended screen in a shared office is
    // the thing the masking exists to prevent.
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(field.type).toBe('password');
  });

  it('stays out of the tab order between the field and the submit button', () => {
    render(<PasswordInput id="pw" />);
    expect(screen.getByLabelText('Show password').getAttribute('tabindex')).toBe('-1');
  });
});
