import { describe, expect, it } from 'vitest';
import { fieldsFromScan } from '../passport';
import type { PassportScanResult } from '@/components/PassportScan';

/**
 * What the registration form does with a passport read.
 *
 * The recorded system announces "passport data extracted & form fields
 * auto-filled" and stops there. These tests hold the line that made this
 * different: a field nothing checked arrives visibly unconfirmed, and stays
 * that way until a person touches it.
 */

function scan(fields: PassportScanResult['fields']): PassportScanResult {
  return { source: 'image', format: 'TD3', valid: true, fields, problems: [], review: [] };
}

describe('applying a passport read to the form', () => {
  it('fills a verified field without asking anybody to check it', () => {
    const { values, flags } = fieldsFromScan(
      scan({
        passportNumber: { value: 'EP1234567', confidence: 'verified', mustReview: false },
      }),
    );

    expect(values.passportNumber).toBe('EP1234567');
    expect(flags.passportNumber).toBeUndefined();
  });

  it('flags anything the document does not check', () => {
    const { flags } = fieldsFromScan(
      scan({
        fullName: { value: 'TESFAYE ALMAZ', confidence: 'probable', mustReview: true },
      }),
    );

    expect(flags.fullName).toContain('Confirm it');
  });

  it('shows what the reader originally saw when a check digit corrected it', () => {
    // Hiding the correction would make a repaired field indistinguishable from
    // a clean read, which is exactly the thing worth seeing.
    const { values, flags } = fieldsFromScan(
      scan({
        passportNumber: {
          value: 'EP1234567',
          confidence: 'repaired',
          mustReview: true,
          raw: 'EP123456T',
        },
      }),
    );

    expect(values.passportNumber).toBe('EP1234567');
    expect(flags.passportNumber).toContain('EP123456T');
  });

  it('leaves a field the reader could not produce alone', () => {
    const { values } = fieldsFromScan(
      scan({ placeOfBirth: { value: '', confidence: 'uncertain', mustReview: true } }),
    );

    // Writing an empty string would wipe something a clerk had already typed.
    expect('placeOfBirth' in values).toBe(false);
  });
});
