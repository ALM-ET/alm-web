import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, FileText, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PassportScan, type PassportScanResult } from '@/components/PassportScan';
import { api } from '@/lib/api';
import { fieldsFromScan } from '@/lib/passport';
import { useAuth } from '@/app/auth';
import { useT } from '@/app/i18n';

/**
 * Build a CV before anybody is registered.
 *
 * This is the order the recorded system works in, and it is not an accident: an
 * agency is often selling a candidate to an employer days before it decides to
 * open a file on them. So the CV is a document you can produce from a form and
 * a photograph alone, and "Proceed to register" carries what was typed into the
 * registration form rather than asking for it twice.
 */

type Values = Record<string, string>;

const BLANK: Values = {
  fullName: '',
  passportNumber: '',
  postAppliedFor: '',
  monthlySalary: '',
  contractPeriod: '',
  nationality: 'ETHIOPIAN',
  religion: '',
  placeOfBirth: '',
  dateOfBirth: '',
  passportIssueDate: '',
  passportExpiryDate: '',
  gender: '',
  maritalStatus: '',
  phone: '',
  heightCm: '',
  weightKg: '',
  currentOccupation: '',
  educationLevel: '',
  englishLevel: '',
  arabicLevel: '',
  destinationCountry: '',
  skillsNotes: '',
};

const RELIGIONS = ['orthodox', 'muslim', 'protestant', 'catholic', 'other'];
const LEVELS = ['none', 'poor', 'fair', 'good', 'fluent'];
const EDUCATION = ['none', 'primary', 'secondary', 'diploma', 'degree'];

function ageFrom(dateOfBirth: string): string {
  if (!dateOfBirth) return '—';
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Number.isFinite(years) && years > 0 ? String(Math.floor(years)) : '—';
}

export function CvBuilder() {
  const t = useT();
  const navigate = useNavigate();
  const { isFlagEnabled } = useAuth();
  const photoInput = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Values>(BLANK);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An object URL is a handle on memory the browser holds until it is revoked.
  // Rebuilding the preview a dozen times while editing would otherwise leak the
  // whole stack of PDFs.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (key: string) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const applyScan = (scan: PassportScanResult) => {
    const { values: filled } = fieldsFromScan(scan);
    // The CV form has no place for fields the registration form carries, so
    // anything it does not know about is dropped rather than silently stored.
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(filled).filter(([name]) => name in BLANK)),
    }));
  };

  const build = async (): Promise<Blob | null> => {
    if (!(values.fullName ?? '').trim()) {
      setError(t('cv.needs_name', 'A CV needs a name. Everything else is optional.'));
      return null;
    }

    setBusy(true);
    setError(null);

    try {
      const draft = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
      const form = new FormData();
      form.append('draft', JSON.stringify(draft));
      if (photo) form.append('photo', photo);

      return await api.getBlob('/api/v1/cv/preview.pdf', { form });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : t('cv.failed', 'Could not build the CV. Check your connection and try again.'),
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async () => {
    const blob = await build();
    if (!blob) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
  };

  const onDownload = async () => {
    const blob = await build();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV-${(values.fullName ?? '').replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('cv.downloaded', 'CV downloaded'));
  };

  const field = (id: string, label: string, node: React.ReactNode, wide = false) => (
    <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`} key={id}>
      <Label htmlFor={id}>{label}</Label>
      {node}
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('cv.title', 'Candidate bio & CV')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t(
            'cv.subtitle',
            'Fill in the details, add a photograph, and produce the CV an employer will read. Nothing is saved until you register the candidate.',
          )}
        </p>
      </div>

      {isFlagEnabled('candidates.passport_scan') && (
        <PassportScan onScanned={applyScan} disabled={busy} />
      )}

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
                <UserRound className="size-4 text-primary" />
                {t('cv.personal', 'Candidate personal details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(
                'fullName',
                t('cv.full_name', 'Full name (matching passport)'),
                <Input id="fullName" value={values.fullName} onChange={set('fullName')} required />,
                true,
              )}
              {field(
                'passportNumber',
                t('cv.passport_number', 'Passport number'),
                <Input id="passportNumber" value={values.passportNumber} onChange={set('passportNumber')} />,
              )}
              {field(
                'postAppliedFor',
                t('cv.post', 'Post applied for'),
                <Input id="postAppliedFor" value={values.postAppliedFor} onChange={set('postAppliedFor')} placeholder="e.g. Domestic Worker" />,
              )}
              {field(
                'monthlySalary',
                t('cv.salary', 'Monthly salary'),
                <Input id="monthlySalary" value={values.monthlySalary} onChange={set('monthlySalary')} placeholder="e.g. 1000 SAR" />,
              )}
              {field(
                'contractPeriod',
                t('cv.contract', 'Contract period'),
                <Input id="contractPeriod" value={values.contractPeriod} onChange={set('contractPeriod')} placeholder="e.g. 2 YEARS" />,
              )}
              {field(
                'nationality',
                t('cv.nationality', 'Nationality'),
                <Input id="nationality" value={values.nationality} onChange={set('nationality')} />,
              )}
              {field(
                'religion',
                t('cv.religion', 'Religion'),
                <Select id="religion" value={values.religion} onChange={set('religion')}>
                  <option value="">Select…</option>
                  {RELIGIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>,
              )}
              {field(
                'placeOfBirth',
                t('cv.place_of_birth', 'Place of birth'),
                <Input id="placeOfBirth" value={values.placeOfBirth} onChange={set('placeOfBirth')} />,
              )}
              {field(
                'dateOfBirth',
                t('cv.date_of_birth', 'Date of birth (age: {age})', { age: ageFrom(values.dateOfBirth ?? '') }),
                <Input id="dateOfBirth" type="date" value={values.dateOfBirth} onChange={set('dateOfBirth')} />,
              )}
              {field(
                'passportIssueDate',
                t('cv.issue_date', 'Passport date of issue'),
                <Input id="passportIssueDate" type="date" value={values.passportIssueDate} onChange={set('passportIssueDate')} />,
              )}
              {field(
                'passportExpiryDate',
                t('cv.expiry_date', 'Passport date of expiry'),
                <Input id="passportExpiryDate" type="date" value={values.passportExpiryDate} onChange={set('passportExpiryDate')} />,
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
                <FileText className="size-4 text-primary" />
                {t('cv.qualifications', 'Qualifications, languages and experience')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(
                'currentOccupation',
                t('cv.occupation', 'Current occupation'),
                <Input id="currentOccupation" value={values.currentOccupation} onChange={set('currentOccupation')} />,
              )}
              {field(
                'educationLevel',
                t('cv.education', 'Education level'),
                <Select id="educationLevel" value={values.educationLevel} onChange={set('educationLevel')}>
                  <option value="">Select…</option>
                  {EDUCATION.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>,
              )}
              {field(
                'englishLevel',
                t('cv.english', 'English'),
                <Select id="englishLevel" value={values.englishLevel} onChange={set('englishLevel')}>
                  <option value="">Select…</option>
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>,
              )}
              {field(
                'arabicLevel',
                t('cv.arabic', 'Arabic'),
                <Select id="arabicLevel" value={values.arabicLevel} onChange={set('arabicLevel')}>
                  <option value="">Select…</option>
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>,
              )}
              {field(
                'destinationCountry',
                t('cv.destination', 'Destination country'),
                <Input id="destinationCountry" value={values.destinationCountry} onChange={set('destinationCountry')} />,
              )}
              {field(
                'phone',
                t('cv.phone', 'Phone number'),
                <Input id="phone" value={values.phone} onChange={set('phone')} />,
              )}
              {field(
                'skillsNotes',
                t('cv.skills', 'Skills, experience and record notes'),
                <Textarea id="skillsNotes" rows={5} value={values.skillsNotes} onChange={set('skillsNotes')} />,
                true,
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide">
                {t('cv.photo', 'Photograph')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => photoInput.current?.click()}>
                {photo ? t('cv.change_photo', 'Choose a different photo') : t('cv.add_photo', 'Add a photograph')}
              </Button>
              {photo && <p className="text-sm text-muted-foreground">{photo.name}</p>}
              <p className="text-sm text-muted-foreground">
                {t('cv.photo_hint', 'A standing portrait is what most employers ask for.')}
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onPreview()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <FileText />}
              {t('cv.preview', 'Preview CV')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void onDownload()} disabled={busy}>
              <Download />
              {t('cv.download', 'Download PDF')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigate('/candidates/new', {
                  // Carried through the router rather than re-typed: the whole
                  // point of building the CV first is not doing this twice.
                  state: { prefill: values },
                })
              }
            >
              {t('cv.proceed', 'Proceed to register')}
              <ArrowRight />
            </Button>
          </div>

          {preview && (
            <Card className="overflow-hidden">
              <iframe
                title={t('cv.preview_title', 'CV preview')}
                src={preview}
                className="h-[560px] w-full border-0"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
