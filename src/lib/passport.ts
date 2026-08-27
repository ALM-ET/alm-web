import type { PassportScanResult } from '@/components/PassportScan';

/**
 * Turning a passport read into form state.
 *
 * Split out from the form because this is the rule, and the rule is the part
 * worth being sure about: which fields get filled, and which of them a person
 * still has to confirm. A wrong answer here is a passport number that looks
 * typed by a human when it was guessed by a reader.
 */

export interface AppliedScan {
  values: Record<string, string>;
  /** Field name → why it needs confirming. Empty when everything checked out. */
  flags: Record<string, string>;
}

export function fieldsFromScan(scan: PassportScanResult): AppliedScan {
  const values: Record<string, string> = {};
  const flags: Record<string, string> = {};

  for (const [name, field] of Object.entries(scan.fields)) {
    if (!field.value) continue;
    values[name] = field.value;

    if (!field.mustReview) continue;

    flags[name] = field.raw
      ? `Read as "${field.raw}" and corrected to match the passport's check digit. Confirm it.`
      : 'Filled from the passport, but nothing on the document checks this. Confirm it.';
  }

  return { values, flags };
}
