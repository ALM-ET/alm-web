// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CandidateDetail } from '@/hooks/queries';
import { CANDIDATE_STORED, SEND_CANDIDATE, extensionPayload, sendToExtension } from '../extension';

const candidate = {
  fullName: 'HIWOT TESFAYE',
  passportNumber: 'EP9100001',
  passportIssueDate: '2024-01-01T00:00:00.000Z',
  passportExpiryDate: '2034-01-01T00:00:00.000Z',
  dateOfBirth: '1996-05-14T00:00:00.000Z',
  gender: 'female',
  nationality: null,
  destinationCountry: null,
  sponsorNationalId: null,
  sponsorRef: 'SP-1',
  visaNumber: '1309876543',
  enjazNumber: 'E-1',
  workedAbroad: true,
  labourId: 'L-1',
} as unknown as CandidateDetail;

afterEach(() => vi.useRealTimers());

describe('extensionPayload', () => {
  it('sends dates as days, and the visa number as the visa number', () => {
    const payload = extensionPayload(candidate);
    expect(payload).toMatchObject({
      candidate_name: 'HIWOT TESFAYE',
      date_of_birth: '1996-05-14',
      passport_expiry_date: '2034-01-01',
      nationality: 'Ethiopian',
      destination_country: 'Saudi Arabia',
      sponsor_id: 'SP-1',
      visa_number: '1309876543',
      enjaz_number: 'E-1',
      experience: 'Experienced',
    });
  });
});

describe('sendToExtension', () => {
  it('resolves stored when the extension confirms', async () => {
    window.addEventListener('message', function reply(event) {
      if (event.data?.type !== SEND_CANDIDATE) return;
      window.removeEventListener('message', reply);
      // Dispatched rather than posted: jsdom's postMessage leaves `source`
      // unset, which a browser never does for a same-window message.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: CANDIDATE_STORED, success: true },
          origin: window.location.origin,
          source: window,
        }),
      );
    });
    await expect(sendToExtension(candidate)).resolves.toBe('stored');
  });

  it('resolves missing when nothing answers', async () => {
    await expect(sendToExtension(candidate, 50)).resolves.toBe('missing');
  });
});
