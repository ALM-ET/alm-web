import { useRef, useState } from 'react';
import { CheckCircle2, FileWarning, Keyboard, Loader2, ScanLine, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useT } from '@/app/i18n';

/**
 * Fast registration: fill the form from the passport.
 *
 * The recorded system shows this as a plain success — "Passport data extracted
 * & form fields auto-filled!" — and the fields simply appear. That is the part
 * worth changing. Optical recognition is a guess, and a wrong passport number
 * is not discovered here; it is discovered at an embassy, months and several
 * fees later, by which time nobody remembers it was typed by a machine.
 *
 * So this reports what it knows and what it does not. The two lines across the
 * bottom of a passport carry check digits, and the fields those cover come back
 * verified. Everything else — the name, the nationality, anything read off the
 * printed page — comes back flagged, and the form marks it until a person has
 * looked at the document and agreed.
 */

export interface ScannedField {
  value: string;
  confidence: 'verified' | 'repaired' | 'probable' | 'uncertain';
  mustReview: boolean;
  raw?: string;
}

export interface PassportScanResult {
  source: 'image' | 'typed';
  format: string;
  valid: boolean;
  fields: Record<string, ScannedField>;
  problems: string[];
  review: string[];
  reader?: { engine: string; confidence: number; tookMs: number; passes: number };
}

export const CONFIDENCE_LABEL: Record<ScannedField['confidence'], string> = {
  verified: 'Checked by the passport itself',
  repaired: 'Corrected to match the check digit',
  probable: 'Not individually checked',
  uncertain: 'Confirm against the document',
};

/** Field names as a clerk would say them, not as the API spells them. */
const FIELD_LABEL: Record<string, string> = {
  fullName: 'Full name',
  passportNumber: 'Passport number',
  dateOfBirth: 'Date of birth',
  passportExpiryDate: 'Passport expiry',
  passportIssueDate: 'Passport issued',
  nationality: 'Nationality',
  gender: 'Sex',
};

export function PassportScan({
  onScanned,
  disabled,
}: {
  onScanned: (scan: PassportScanResult) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [typing, setTyping] = useState(false);
  const [mrz, setMrz] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PassportScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);

    try {
      let scan: PassportScanResult;

      if (typing) {
        scan = await api.post<PassportScanResult>('/api/v1/candidates/passport-scan', { mrz });
      } else {
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        scan = await api.postForm<PassportScanResult>('/api/v1/candidates/passport-scan', form);
      }

      setResult(scan);
      onScanned(scan);

      const flagged = scan.review.length;
      if (scan.valid && !flagged) {
        toast.success(t('scan.filled_clean', 'Form filled from the passport. Every checked field matched.'));
      } else {
        toast.warning(
          t('scan.filled_review', 'Form filled. {count} field(s) need confirming against the document.', {
            count: String(flagged),
          }),
        );
      }
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : t('scan.unreachable', 'Could not reach the server. Check your connection and try again.');
      setError(message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
          <ScanLine className="size-4 text-primary" />
          {t('scan.title', 'Fast registration: fill from the passport')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            'scan.subtitle',
            'The two lines across the bottom of a passport carry check digits. Fields those cover are marked as checked; everything else is flagged for you to confirm.',
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              setResult(null);
              setError(null);
            }}
          />

          {!typing && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload />
                {file
                  ? t('scan.change_image', 'Choose a different image')
                  : t('scan.choose_image', 'Upload passport image')}
              </Button>
              {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => {
              setTyping((current) => !current);
              setResult(null);
              setError(null);
            }}
          >
            <Keyboard />
            {typing
              ? t('scan.use_image', 'Use an image instead')
              : t('scan.type_zone', 'Type the two lines instead')}
          </Button>
        </div>

        {typing && (
          <div className="space-y-2">
            <Textarea
              value={mrz}
              onChange={(event) => setMrz(event.target.value)}
              rows={3}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder={'P<ETHTESFAYE<<ALMAZ<MAMO<<<<<<<<<<<<<<<<<<<<\nEP12345671ETH9803145F3006128<<<<<<<<<<<<<<06'}
              aria-label={t('scan.zone_label', 'Machine-readable zone')}
            />
            <p className="text-sm text-muted-foreground">
              {t(
                'scan.type_hint',
                'Typing works with no scanner and no reader installed — the check digits do the verifying either way.',
              )}
            </p>
          </div>
        )}

        <Button
          type="button"
          disabled={disabled || busy || (typing ? mrz.trim().length < 20 : !file)}
          onClick={() => void run()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ScanLine />}
          {busy
            ? t('scan.reading', 'Reading the passport…')
            : t('scan.process', 'Process & fill the form')}
        </Button>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {result.valid ? (
                <Badge tone="success">
                  <CheckCircle2 className="size-3.5" />
                  {t('scan.all_checked', 'Every check digit matched')}
                </Badge>
              ) : (
                <Badge tone="warning">
                  <FileWarning className="size-3.5" />
                  {t('scan.needs_review', '{count} field(s) need confirming', {
                    count: String(result.review.length),
                  })}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {result.format}
                {result.reader
                  ? ` · ${result.reader.engine} · ${result.reader.passes} pass(es) · ${result.reader.tookMs}ms`
                  : ` · ${t('scan.typed', 'typed by hand')}`}
              </span>
            </div>

            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.entries(result.fields).map(([name, field]) => (
                <div key={name} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {FIELD_LABEL[name] ?? name}
                  </dt>
                  <dd className="flex items-center gap-2 text-sm font-medium">
                    <span>{field.value || '—'}</span>
                    <span
                      className={
                        field.confidence === 'verified'
                          ? 'size-2 rounded-full bg-[var(--color-success)]'
                          : field.confidence === 'uncertain'
                            ? 'size-2 rounded-full bg-[var(--color-destructive)]'
                            : 'size-2 rounded-full bg-[var(--color-warning)]'
                      }
                      title={CONFIDENCE_LABEL[field.confidence]}
                      aria-label={CONFIDENCE_LABEL[field.confidence]}
                    />
                  </dd>
                </div>
              ))}
            </dl>

            {result.problems.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {result.problems.map((problem) => (
                  <li key={problem}>· {problem}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
