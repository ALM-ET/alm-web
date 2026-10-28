import type { CandidateDetail } from '@/hooks/queries';

/**
 * The hand-off to the A-LMIS Auto-Fill browser extension (alm-extension/).
 *
 * The page posts the candidate to itself; the extension's content script,
 * which runs only on A-LMIS origins, picks it up and stores it for filling
 * visa and medical portal forms. Names are prefixed `ALM_` rather than the
 * `EMS_` an older third-party extension uses, because that one listens on
 * every site and would otherwise receive A-LMIS candidates too.
 */

export const SEND_CANDIDATE = 'ALM_SEND_CANDIDATE';
export const CANDIDATE_STORED = 'ALM_CANDIDATE_STORED';

const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : undefined);

/** Snake-case keys are the extension's vocabulary, shared by every portal map. */
export function extensionPayload(candidate: CandidateDetail): Record<string, string | number | undefined> {
  return {
    candidate_name: candidate.fullName,
    passport_number: candidate.passportNumber,
    // A-LMIS records no passport type; agencies place on ordinary passports.
    passport_type: 'Normal',
    passport_issue_date: day(candidate.passportIssueDate),
    passport_expiry_date: day(candidate.passportExpiryDate),
    date_of_birth: day(candidate.dateOfBirth),
    place_of_birth: candidate.placeOfBirth ?? undefined,
    nationality: candidate.nationality ?? 'Ethiopian',
    issuing_country: 'Ethiopia',
    gender: candidate.gender ?? undefined,
    marital_status: candidate.maritalStatus ?? undefined,
    religion: candidate.religion ?? undefined,
    qualification: candidate.educationLevel ?? undefined,
    post_applied_for: candidate.postAppliedFor ?? candidate.currentOccupation ?? undefined,
    current_occupation: candidate.currentOccupation ?? candidate.postAppliedFor ?? undefined,
    destination_country: candidate.destinationCountry ?? 'Saudi Arabia',
    sponsor_name: candidate.sponsorName ?? undefined,
    sponsor_id: candidate.sponsorNationalId ?? candidate.sponsorRef ?? undefined,
    sponsor_phone: candidate.sponsorPhone ?? undefined,
    sponsor_address: candidate.sponsorAddress ?? undefined,
    visa_number: candidate.visaNumber ?? undefined,
    visa_type: candidate.visaType ?? undefined,
    visa_kind: 'wv',
    enjaz_number: candidate.enjazNumber ?? undefined,
    // The Saudi mission that issues the visa is the one where the candidate is.
    nearest_mission: 'ADDIS ABABA',
    transport_mode: 'air',
    expected_entry_date: day(candidate.departureDate),
    phone_number: candidate.phone ?? undefined,
    height: candidate.heightCm ?? undefined,
    weight: candidate.weightKg ?? undefined,
    experience: candidate.workedAbroad ? 'Experienced' : 'First timer',
    labour_id: candidate.labourId,
  };
}

/**
 * Post the candidate and wait for the extension to confirm it was stored.
 * Resolves `missing` when nothing answers, which is what no extension looks like.
 */
export function sendToExtension(
  candidate: CandidateDetail,
  timeoutMs = 2500,
): Promise<'stored' | 'failed' | 'missing'> {
  return new Promise((resolve) => {
    const finish = (outcome: 'stored' | 'failed' | 'missing') => {
      window.removeEventListener('message', listen);
      clearTimeout(timer);
      resolve(outcome);
    };
    const listen = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type !== CANDIDATE_STORED) return;
      finish(event.data.success ? 'stored' : 'failed');
    };
    const timer = setTimeout(() => finish('missing'), timeoutMs);

    window.addEventListener('message', listen);
    window.postMessage({ type: SEND_CANDIDATE, payload: extensionPayload(candidate) }, window.location.origin);
  });
}
