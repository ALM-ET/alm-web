import { describe, expect, it } from 'vitest';
import { cn, initials } from '../utils';

describe('cn', () => {
  it('lets a later Tailwind utility win over an earlier conflicting one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('System Administrator')).toBe('SA');
    expect(initials('Abebe Bikila Tesfaye')).toBe('AB');
  });

  it('handles a single name', () => {
    expect(initials('Abebe')).toBe('A');
  });

  it('survives empty input rather than throwing', () => {
    expect(initials('')).toBe('');
    expect(initials('   ')).toBe('');
  });
});
