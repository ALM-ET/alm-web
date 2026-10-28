/**
 * Read the sponsor and visa details a clerk copies out of Musaned.
 *
 * The six fields are confirmed: they are exactly what EasyEnjaz's Musaned
 * paste fills. Everything else on a candidate (national ID, Arabic name,
 * Wakala, sticker visa…) is left for the clerk, as EasyEnjaz leaves it.
 *
 * PLACEHOLDER: the *text format* is not. No real paste was available — the
 * EasyEnjaz button may read Musaned through a live session rather than the
 * clipboard — so this matches "label: value" lines against likely English and
 * Arabic labels, and reports every line it could not place rather than
 * guessing. The dialog using it doubles as plain manual entry. Replace the
 * label lists once a real paste is in hand; `musaned.test.ts` is where that
 * sample belongs.
 */

export type MusanedField =
  | 'visaNumber'
  | 'visaType'
  | 'sponsorName'
  | 'sponsorRef'
  | 'sponsorPhone'
  | 'sponsorAddress';

export const MUSANED_FIELDS: { field: MusanedField; label: string }[] = [
  { field: 'visaNumber', label: 'Visa no.' },
  { field: 'visaType', label: 'Visa type' },
  { field: 'sponsorName', label: 'Sponsor name' },
  { field: 'sponsorRef', label: 'Sponsor ID' },
  { field: 'sponsorPhone', label: 'Sponsor phone' },
  { field: 'sponsorAddress', label: 'Sponsor address' },
];

/** Labels are compared lower-cased, with punctuation and repeated spaces removed. */
const LABELS: Record<MusanedField, string[]> = {
  visaNumber: ['visa no', 'visa number', 'رقم التأشيرة', 'رقم التاشيرة'],
  visaType: ['visa type', 'type of visa', 'نوع التأشيرة', 'نوع التاشيرة'],
  sponsorName: ['sponsor name', 'employer name', 'name of employer', 'sponsor', 'اسم صاحب العمل', 'اسم الكفيل'],
  sponsorRef: ['sponsor id', 'employer id', 'sponsor no', 'employer no', 'رقم صاحب العمل', 'رقم الكفيل', 'هوية صاحب العمل'],
  sponsorPhone: ['mobile', 'mobile no', 'phone', 'sponsor phone', 'sponsor mobile', 'رقم الجوال', 'الجوال', 'رقم الهاتف'],
  sponsorAddress: ['address', 'sponsor address', 'city', 'العنوان', 'المدينة'],
};

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** Musaned prints numbers in Arabic-Indic digits as often as Western ones. */
function westernDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[#:.\-_()؛،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_LABEL = new Map<string, MusanedField>(
  (Object.entries(LABELS) as [MusanedField, string[]][]).flatMap(([field, labels]) =>
    labels.map((label) => [normaliseLabel(label), field] as const),
  ),
);

export interface MusanedResult {
  values: Partial<Record<MusanedField, string>>;
  /** Lines that held text but matched no known label. Shown, never dropped. */
  unmatched: string[];
}

export function parseMusaned(text: string): MusanedResult {
  const values: Partial<Record<MusanedField, string>> = {};
  const unmatched: string[] = [];

  const lines = westernDigits(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    // "Label: value", "Label\tvalue", or a label alone with the value on the
    // next line — the three shapes a copied table or form tends to take.
    let label: string;
    let value: string;
    const split = /^([^:\t]+?)\s*[:\t]\s*(.*)$/.exec(line);
    if (split) {
      label = split[1]!;
      value = split[2]!.trim();
    } else {
      label = line;
      value = '';
    }

    const field = BY_LABEL.get(normaliseLabel(label));
    if (field && !value && index + 1 < lines.length && !BY_LABEL.has(normaliseLabel(lines[index + 1]!))) {
      value = lines[index + 1]!;
      index += 1;
    }

    if (!field || !value) {
      unmatched.push(line);
      continue;
    }

    // The first occurrence wins; a repeated label is more likely a second
    // party (a representative, say) than a correction.
    values[field] ??= value;
  }

  return { values, unmatched };
}
