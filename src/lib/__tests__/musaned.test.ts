import { describe, expect, it } from 'vitest';
import { parseMusaned } from '../musaned';

/**
 * Against invented pastes only: no real Musaned copy was available when the
 * parser was written. Add a redacted real one here first when it is.
 */
describe('parseMusaned (placeholder format)', () => {
  it('reads the six confirmed fields from English "label: value" lines', () => {
    const { values, unmatched } = parseMusaned(
      [
        'Visa No: 1309876543',
        'Visa Type: Work',
        'Sponsor Name: MOHAMMED ALHARBI',
        'Sponsor ID: 1012345678',
        'Mobile: 0501234567',
        'City: RIYADH',
      ].join('\n'),
    );
    expect(values).toEqual({
      visaNumber: '1309876543',
      visaType: 'Work',
      sponsorName: 'MOHAMMED ALHARBI',
      sponsorRef: '1012345678',
      sponsorPhone: '0501234567',
      sponsorAddress: 'RIYADH',
    });
    expect(unmatched).toEqual([]);
  });

  it('reads Arabic labels and Arabic-Indic digits', () => {
    const { values } = parseMusaned('اسم صاحب العمل: محمد الحربي\nرقم التأشيرة: ١٣٠٩٨٧٦٥٤٣\nنوع التأشيرة: عمل');
    expect(values).toEqual({ sponsorName: 'محمد الحربي', visaNumber: '1309876543', visaType: 'عمل' });
  });

  it('takes a value from the next line when the label stands alone', () => {
    expect(parseMusaned('Visa Number\n1309876543').values).toEqual({ visaNumber: '1309876543' });
  });

  it('leaves fields the Musaned paste does not fill, and says so', () => {
    const { values, unmatched } = parseMusaned('National ID: 1012345678\nVisa No: 123\nrandom text');
    expect(values).toEqual({ visaNumber: '123' });
    expect(unmatched).toEqual(['National ID: 1012345678', 'random text']);
  });
});
