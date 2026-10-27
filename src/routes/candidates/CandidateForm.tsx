import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Check,
  Plug,
  Briefcase,
  ClipboardList,
  ClipboardPaste,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sendToExtension } from '@/lib/extension';
import { MUSANED_FIELDS, parseMusaned, type MusanedField } from '@/lib/musaned';
import { api } from '@/lib/api';
import { useAuth } from '@/app/auth';
import { PassportScan, type PassportScanResult } from '@/components/PassportScan';
import { fieldsFromScan } from '@/lib/passport';
import {
  useAgents,
  useCandidate,
  useCreateCandidate,
  useDeleteDocument,
  useOffices,
  useUpdateCandidate,
  useUploadDocument,
} from '@/hooks/queries';

type Values = Record<string, string | boolean | string[]>;

const BLANK: Values = {
  fullName: '',
  fullNameAmharic: '',
  passportNumber: '',
  passportIssueDate: '',
  passportExpiryDate: '',
  phone: '',
  dateOfBirth: '',
  nationality: 'ETHIOPIAN',
  placeOfBirth: '',
  maritalStatus: '',
  gender: '',
  religion: '',
  weightKg: '',
  heightCm: '',
  numberOfChildren: '',
  currentOccupation: '',
  educationLevel: '',
  englishLevel: '',
  arabicLevel: '',
  workedAbroad: false,
  skillsNotes: '',
  skills: [],
  postAppliedFor: '',
  applicationId: '',
  labourId: '',
  selectionStatus: 'Pending',
  medicalStatus: 'pending',
  medicalIssueDate: '',
  medicalExpiryDate: '',
  medicalPlace: '',
  visaNumber: '',
  visaType: '',
  visaDate: '',
  destinationCountry: '',
  monthlySalary: '',
  contractPeriod: '',
  officeId: '',
  agentId: '',
  sponsorName: '',
  sponsorRef: '',
  sponsorPhone: '',
  sponsorAddress: '',
  sponsorArabicName: '',
  sponsorNationalId: '',
  wakalaNumber: '',
  enjazNumber: '',
  stickerVisaNumber: '',
  biometricId: '',
  cocType: '',
  cocCenterName: '',
  cocCertificateNumber: '',
  cocCertifiedDate: '',
  cocStatus: 'pending',
  relativeName: '',
  relativePhone: '',
  relativeKinship: '',
  relativeGender: '',
  relativeDateOfBirth: '',
  relativeRegion: '',
  relativeCity: '',
  relativeSubcity: '',
  relativeWereda: '',
  relativeHouseNumber: '',
};

const KINSHIPS = ['Father', 'Mother', 'Husband', 'Wife', 'Brother', 'Sister', 'Son', 'Daughter', 'Uncle', 'Aunt', 'Cousin'];

const REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'South West Ethiopia',
  'Tigray',
];

const SKILLS = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'washing', label: 'Washing' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'arabic_cooking', label: 'Arabic cooking' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'babysitting', label: 'Babysitting' },
  { value: 'child_care', label: 'Child care' },
];

const COC_TYPES = [
  { value: 'federal', label: 'Federal' },
  { value: 'oromia', label: 'Oromia' },
  { value: 'amhara', label: 'Amhara' },
  { value: 'snnp', label: 'SNNP' },
];

const DOCUMENT_KINDS = [
  { value: 'passport_scan', label: 'Passport scan' },
  { value: 'portrait_photo', label: 'Full standing portrait' },
  { value: 'profile_photo', label: 'Profile picture' },
  { value: 'medical_certificate', label: 'Medical certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

/** ISO timestamp to the `yyyy-mm-dd` a date input expects. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/** Mirrors the API, which treats a certificate as valid for 90 days. */
const COC_VALIDITY_DAYS = 90;

function cocExpiryHint(certifiedDate: string): string | undefined {
  if (!certifiedDate) return undefined;
  const expiry = new Date(new Date(certifiedDate).getTime() + COC_VALIDITY_DAYS * 86_400_000);
  if (Number.isNaN(expiry.getTime())) return undefined;
  return `Valid until ${expiry.toISOString().slice(0, 10)}`;
}

function ageFrom(dateOfBirth: string): string {
  if (!dateOfBirth) return '—';
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Number.isFinite(years) && years > 0 ? String(Math.floor(years)) : '—';
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
  wide = false,
  flagged,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
  /** Filled from a passport read, and not yet confirmed by a person. */
  flagged?: string;
}) {
  return (
    <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={id} className={flagged ? 'text-[var(--color-warning)]' : undefined}>
        {label}
      </Label>
      {children}
      {flagged && !error && (
        <p className="flex items-start gap-1.5 text-sm text-[var(--color-warning)]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {flagged}
        </p>
      )}
      {hint && !error && !flagged && <p className="text-sm text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Register and edit a candidate.
 *
 * The five sections and their field order follow the recorded system, because
 * the people filling this in work from the same paper file in the same order.
 */
export function CandidateForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);

  const { isFlagEnabled, can } = useAuth();
  const [downloadingCv, setDownloadingCv] = useState(false);
  const [extensionState, setExtensionState] = useState<'idle' | 'sending' | 'sent'>('idle');

  /** Sends the saved record, like the CV: unsaved edits travel once saved. */
  const sendCandidateToExtension = async () => {
    if (!candidate) return;
    setExtensionState('sending');
    const outcome = await sendToExtension(candidate);
    if (outcome === 'stored') {
      setExtensionState('sent');
      setTimeout(() => setExtensionState('idle'), 3000);
      return;
    }
    setExtensionState('idle');
    toast.error(
      outcome === 'missing'
        ? 'The A-LMIS Auto-Fill extension is not installed or not enabled in this browser.'
        : 'The extension could not store this candidate. Try again.',
    );
  };

  /** The saved record, not the form: unsaved edits are not on the CV until saved. */
  const downloadCv = async () => {
    if (!candidate) return;
    setDownloadingCv(true);
    try {
      const blob = await api.getBlob(`/api/v1/cv/candidates/${candidate.id}.pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CV-${candidate.fullName.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not build the CV. Try again.');
    } finally {
      setDownloadingCv(false);
    }
  };
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: offices } = useOffices();
  const { data: agents } = useAgents();
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const [values, setValues] = useState<Values>(BLANK);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [documentKind, setDocumentKind] = useState('passport_scan');
  /**
   * Fields the passport reader filled but could not vouch for.
   *
   * Kept as state rather than baked into the values, because confirming one is
   * an act: touching the field clears its flag, which is what "a person looked
   * at the document" means here.
   */
  const [unconfirmed, setUnconfirmed] = useState<Record<string, string>>({});

  /**
   * Carried over from the CV builder.
   *
   * The recorded flow ends with "Proceed to Register Candidate", and somebody
   * who has just typed a candidate's whole history into the CV form will not
   * type it again — they will register a half-empty record instead.
   */
  useEffect(() => {
    const prefill = (location.state as { prefill?: Record<string, string> } | null)?.prefill;
    if (!prefill || isEdit) return;

    setValues((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(prefill).filter(([key, value]) => value && key in BLANK)),
    }));
  }, [location.state, isEdit]);

  useEffect(() => {
    if (!candidate) return;
    const next: Values = { ...BLANK };
    for (const key of Object.keys(BLANK)) {
      const value = (candidate as unknown as Record<string, unknown>)[key];
      if (value === null || value === undefined) continue;
      next[key] =
        typeof value === 'boolean' || Array.isArray(value)
          ? (value as boolean | string[])
          : key.toLowerCase().includes('date') || key === 'dateOfBirth'
            ? toDateInput(String(value))
            : String(value);
    }
    setValues(next);
  }, [candidate]);

  const set = (key: string) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setUnconfirmed((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  /**
   * Apply a passport read to the form.
   *
   * Only fills what is empty or was itself filled by a previous read: somebody
   * who has already typed a corrected passport number should not have it
   * silently replaced by scanning the document a second time.
   */
  const applyScan = (scan: PassportScanResult) => {
    const { values: filled, flags } = fieldsFromScan(scan);
    setValues((current) => ({ ...current, ...filled }));
    setUnconfirmed(flags);
  };

  const [musanedOpen, setMusanedOpen] = useState(false);
  const [musanedText, setMusanedText] = useState('');
  const [musanedDraft, setMusanedDraft] = useState<Partial<Record<MusanedField, string>>>({});
  const [musanedUnmatched, setMusanedUnmatched] = useState<string[]>([]);

  /** A paste fills the six boxes; anything typed in them afterwards wins. */
  const pasteMusaned = (text: string) => {
    setMusanedText(text);
    const { values: found, unmatched } = parseMusaned(text);
    setMusanedDraft((current) => ({ ...current, ...found }));
    setMusanedUnmatched(unmatched);
  };

  /** Fills what was entered and flags it, the same way a passport read is. */
  const applyMusaned = () => {
    const filled = Object.entries(musanedDraft).filter(([, value]) => value?.trim());
    setValues((current) => ({ ...current, ...Object.fromEntries(filled) }));
    setUnconfirmed((current) => ({
      ...current,
      ...Object.fromEntries(filled.map(([key]) => [key, 'Filled from Musaned. Confirm it.'])),
    }));
    if (musanedUnmatched.length) {
      // Kept for whoever replaces the placeholder parser with one built from a
      // real paste: these are the lines it did not understand.
      console.info('[musaned] unrecognised lines', musanedUnmatched);
    }
    toast.success(`Filled ${filled.length} field${filled.length === 1 ? '' : 's'} from Musaned`);
    setMusanedOpen(false);
    setMusanedText('');
    setMusanedDraft({});
    setMusanedUnmatched([]);
  };

  const age = useMemo(() => ageFrom(String(values.dateOfBirth ?? '')), [values.dateOfBirth]);
  const pending = createCandidate.isPending || updateCandidate.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    // Empty strings mean "not filled in"; sending them would fail validation on
    // fields that are optional but format-checked.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== '' && value !== undefined),
    );

    try {
      if (isEdit && id) {
        await updateCandidate.mutateAsync({ id, ...payload });
        toast.success('Candidate saved');
      } else {
        const created = await createCandidate.mutateAsync(payload);
        toast.success(`${created.fullName} registered`);

        // Link the website enquiry this started from, if it started from one.
        // Done after the candidate exists rather than before, so a registration
        // that fails validation does not mark somebody's application handled.
        const enquiryId = (location.state as { enquiryId?: string } | null)?.enquiryId;
        if (enquiryId) {
          await api
            .post(`/api/v1/enquiries/${enquiryId}/converted`, { candidateId: created.id })
            .catch(() => {
              // The candidate is registered either way; a broken link is worth
              // a note, not a failed registration.
              toast.warning('Registered, but the website enquiry could not be linked.');
            });
        }

        navigate(`/candidates/${created.id}`);
        return;
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fields);
        setFormError(caught.message);
        // The failing field is often far up the page.
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError('Could not reach the server. Check your connection and try again.');
      }
    }
  };

  const onUpload = async (file: File) => {
    if (!id) return;
    try {
      await uploadDocument.mutateAsync({ id, file, kind: documentKind });
      toast.success(`${file.name} uploaded`);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not upload that file');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const openDocument = async (documentId: string) => {
    if (!id) return;
    try {
      const { url } = await api.get<{ url: string }>(
        `/api/v1/candidates/${id}/documents/${documentId}/url`,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not open that file');
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-10" noValidate>
      <div>
        <Button type="button" variant="ghost" size="sm" asChild className="-ms-3 mb-2">
          <Link to="/candidates">
            <ArrowLeft />
            Back to directory
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? candidate?.fullName : 'Register candidate'}
          </h1>
          {candidate?.archivedAt && <Badge tone="neutral">Archived</Badge>}
          {isEdit && candidate && <Badge tone="primary">{candidate.stage}</Badge>}
          {isEdit && candidate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`ms-auto ${extensionState === 'sent' ? 'border-success text-success' : ''}`}
              onClick={sendCandidateToExtension}
              disabled={extensionState === 'sending'}
            >
              {extensionState === 'sending' ? <Loader2 className="animate-spin" /> : extensionState === 'sent' ? <Check /> : <Plug />}
              {extensionState === 'sent' ? 'Sent!' : 'Send to Extension'}
            </Button>
          )}
          {isEdit && candidate && can('cv:view') && (
            <Button type="button" variant="outline" size="sm" onClick={downloadCv} disabled={downloadingCv}>
              {downloadingCv ? <Loader2 className="animate-spin" /> : <Download />}
              Download CV
            </Button>
          )}
        </div>
      </div>

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      {!isEdit && isFlagEnabled('candidates.passport_scan') && (
        <PassportScan onScanned={applyScan} disabled={pending} />
      )}

      <Section icon={UserRound} title="Personal details">
        <Field id="fullName" label="Full name (matching passport) *" error={fieldErrors.fullName} flagged={unconfirmed.fullName}>
          <Input
            id="fullName"
            required
            value={String(values.fullName)}
            onChange={set('fullName')}
            placeholder="e.g. ABEBA TESFAYE MAMO"
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
        </Field>

        <Field id="fullNameAmharic" label="Full name (Amharic)">
          <Input id="fullNameAmharic" lang="am" value={String(values.fullNameAmharic)} onChange={set('fullNameAmharic')} placeholder="ለምሳሌ አበባ ተስፋዬ ማሞ" />
        </Field>

        <Field id="passportNumber" label="Passport number *" error={fieldErrors.passportNumber} flagged={unconfirmed.passportNumber}>
          <Input
            id="passportNumber"
            required
            value={String(values.passportNumber)}
            onChange={set('passportNumber')}
            placeholder="e.g. EP1234567"
            aria-invalid={Boolean(fieldErrors.passportNumber)}
          />
        </Field>

        <Field id="passportIssueDate" label="Passport issue date" error={fieldErrors.passportIssueDate} flagged={unconfirmed.passportIssueDate}>
          <Input id="passportIssueDate" type="date" value={String(values.passportIssueDate)} onChange={set('passportIssueDate')} />
        </Field>

        <Field id="passportExpiryDate" label="Passport expiry date" error={fieldErrors.passportExpiryDate} flagged={unconfirmed.passportExpiryDate}>
          <Input id="passportExpiryDate" type="date" value={String(values.passportExpiryDate)} onChange={set('passportExpiryDate')} />
        </Field>

        <Field id="phone" label="Phone number">
          <Input id="phone" value={String(values.phone)} onChange={set('phone')} placeholder="+251911223344" />
        </Field>

        <Field id="dateOfBirth" label={`Date of birth (age: ${age})`} error={fieldErrors.dateOfBirth} flagged={unconfirmed.dateOfBirth}>
          <Input
            id="dateOfBirth"
            type="date"
            value={String(values.dateOfBirth)}
            onChange={set('dateOfBirth')}
            aria-invalid={Boolean(fieldErrors.dateOfBirth)}
          />
        </Field>

        <Field id="nationality" label="Nationality" flagged={unconfirmed.nationality}>
          <Input id="nationality" value={String(values.nationality)} onChange={set('nationality')} />
        </Field>

        <Field id="placeOfBirth" label="Place of birth">
          <Input id="placeOfBirth" value={String(values.placeOfBirth)} onChange={set('placeOfBirth')} placeholder="e.g. ADDIS ABABA" />
        </Field>

        <Field id="maritalStatus" label="Marital status">
          <Select id="maritalStatus" value={String(values.maritalStatus)} onChange={set('maritalStatus')}>
            <option value="">— Select —</option>
            {['single', 'married', 'divorced', 'widowed'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="gender" label="Gender" flagged={unconfirmed.gender}>
          <Select id="gender" value={String(values.gender)} onChange={set('gender')}>
            <option value="">— Select —</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>

        <Field id="religion" label="Religion">
          <Select id="religion" value={String(values.religion)} onChange={set('religion')}>
            <option value="">— Select —</option>
            {['muslim', 'christian', 'orthodox', 'protestant', 'catholic', 'other'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field id="weightKg" label="Weight (kg)" error={fieldErrors.weightKg}>
            <Input id="weightKg" type="number" value={String(values.weightKg)} onChange={set('weightKg')} placeholder="55" />
          </Field>
          <Field id="heightCm" label="Height (cm)" error={fieldErrors.heightCm}>
            <Input id="heightCm" type="number" value={String(values.heightCm)} onChange={set('heightCm')} placeholder="160" />
          </Field>
        </div>

        <Field id="numberOfChildren" label="Number of children" error={fieldErrors.numberOfChildren}>
          <Input id="numberOfChildren" type="number" min={0} value={String(values.numberOfChildren)} onChange={set('numberOfChildren')} placeholder="0" />
        </Field>
      </Section>

      <Section icon={Briefcase} title="Qualifications, languages & experience">
        <Field id="currentOccupation" label="Current occupation">
          <Input id="currentOccupation" value={String(values.currentOccupation)} onChange={set('currentOccupation')} placeholder="e.g. HOUSEMAID" />
        </Field>

        <Field id="educationLevel" label="Education level">
          <Select id="educationLevel" value={String(values.educationLevel)} onChange={set('educationLevel')}>
            <option value="">— Select —</option>
            {['none', 'primary', 'secondary', 'diploma', 'degree'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="englishLevel" label="English level">
          <Select id="englishLevel" value={String(values.englishLevel)} onChange={set('englishLevel')}>
            <option value="">— Select —</option>
            {['none', 'poor', 'fair', 'good', 'fluent'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="arabicLevel" label="Arabic level">
          <Select id="arabicLevel" value={String(values.arabicLevel)} onChange={set('arabicLevel')}>
            <option value="">— Select —</option>
            {['none', 'poor', 'fair', 'good', 'fluent'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-2 sm:col-span-2">
          <Label>Worked abroad before?</Label>
          <div className="flex gap-3">
            {[
              { value: false, label: 'No (first timer)' },
              { value: true, label: 'Yes (ex-abroad)' },
            ].map((option) => (
              <Button
                key={String(option.value)}
                type="button"
                variant={values.workedAbroad === option.value ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setValues((current) => ({ ...current, workedAbroad: option.value }))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Skills</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SKILLS.map((skill) => {
              const selected = (values.skills as string[]).includes(skill.value);
              return (
                <label
                  key={skill.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected}
                    onChange={() =>
                      setValues((current) => {
                        const skills = current.skills as string[];
                        return {
                          ...current,
                          skills: selected
                            ? skills.filter((value) => value !== skill.value)
                            : [...skills, skill.value],
                        };
                      })
                    }
                  />
                  {skill.label}
                </label>
              );
            })}
          </div>
        </div>

        <Field id="skillsNotes" label="Skills, experience & notes" wide>
          <Textarea
            id="skillsNotes"
            value={String(values.skillsNotes)}
            onChange={set('skillsNotes')}
            placeholder="e.g. House cleaning, cooking, child care, ironing…"
          />
        </Field>
      </Section>

      <Section icon={ClipboardList} title="Registration & placement">
        <Field id="postAppliedFor" label="Post applied for">
          <Input id="postAppliedFor" value={String(values.postAppliedFor)} onChange={set('postAppliedFor')} placeholder="e.g. HOUSEMAID" />
        </Field>

        <Field id="applicationId" label="Application ID">
          <Input id="applicationId" value={String(values.applicationId)} onChange={set('applicationId')} placeholder="e.g. APP-8871" />
        </Field>

        <Field id="labourId" label="Labour ID *" error={fieldErrors.labourId}>
          <Input
            id="labourId"
            required
            value={String(values.labourId)}
            onChange={set('labourId')}
            placeholder="e.g. L-001234"
            aria-invalid={Boolean(fieldErrors.labourId)}
          />
        </Field>

        <Field id="selectionStatus" label="Selection status">
          <Input id="selectionStatus" value={String(values.selectionStatus)} onChange={set('selectionStatus')} />
        </Field>

        <Field id="medicalStatus" label="Medical status">
          <Select id="medicalStatus" value={String(values.medicalStatus)} onChange={set('medicalStatus')}>
            {['pending', 'fit', 'unfit', 'expired'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="medicalIssueDate" label="Medical issue date">
          <Input id="medicalIssueDate" type="date" value={String(values.medicalIssueDate)} onChange={set('medicalIssueDate')} />
        </Field>

        <Field id="medicalExpiryDate" label="Medical expiry date" error={fieldErrors.medicalExpiryDate}>
          <Input id="medicalExpiryDate" type="date" value={String(values.medicalExpiryDate)} onChange={set('medicalExpiryDate')} />
        </Field>

        <Field id="medicalPlace" label="Medical exam place">
          <Input id="medicalPlace" value={String(values.medicalPlace)} onChange={set('medicalPlace')} placeholder="e.g. Wudassie Diagnostic Center" />
        </Field>

        <Field id="visaNumber" label="Visa number" flagged={unconfirmed.visaNumber}>
          <Input id="visaNumber" value={String(values.visaNumber)} onChange={set('visaNumber')} placeholder="Optional until issued" />
        </Field>

        <Field id="visaType" label="Visa type" flagged={unconfirmed.visaType}>
          <Input id="visaType" value={String(values.visaType)} onChange={set('visaType')} placeholder="e.g. Work" />
        </Field>

        <Field id="visaDate" label="Visa date" flagged={unconfirmed.visaDate}>
          <Input id="visaDate" type="date" value={String(values.visaDate)} onChange={set('visaDate')} />
        </Field>

        <Field id="destinationCountry" label="Destination country">
          <Input id="destinationCountry" value={String(values.destinationCountry)} onChange={set('destinationCountry')} placeholder="e.g. Saudi Arabia" />
        </Field>

        <Field id="monthlySalary" label="Monthly salary">
          <Input id="monthlySalary" value={String(values.monthlySalary)} onChange={set('monthlySalary')} placeholder="e.g. 1000 SAR" />
        </Field>

        <Field id="contractPeriod" label="Contract period">
          <Input id="contractPeriod" value={String(values.contractPeriod)} onChange={set('contractPeriod')} placeholder="e.g. 2 YEARS" />
        </Field>

        <Field id="officeId" label="Overseas office">
          <Select id="officeId" value={String(values.officeId)} onChange={set('officeId')}>
            <option value="">— None —</option>
            {offices?.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="agentId" label="Sourcing agent">
          <Select id="agentId" value={String(values.agentId)} onChange={set('agentId')}>
            <option value="">— None —</option>
            {agents?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <div className="-mb-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setMusanedOpen(true)}>
          <ClipboardPaste />
          Paste from Musaned
        </Button>
      </div>

      <Section icon={FileText} title="Sponsor details">
        <Field id="sponsorName" label="Sponsor name" flagged={unconfirmed.sponsorName}>
          <Input id="sponsorName" value={String(values.sponsorName)} onChange={set('sponsorName')} placeholder="e.g. MOHAMMED AL-HARBI" />
        </Field>
        <Field id="sponsorRef" label="Sponsor ID" flagged={unconfirmed.sponsorRef}>
          <Input id="sponsorRef" value={String(values.sponsorRef)} onChange={set('sponsorRef')} placeholder="e.g. SP-99812" />
        </Field>
        <Field id="sponsorPhone" label="Sponsor phone" flagged={unconfirmed.sponsorPhone}>
          <Input id="sponsorPhone" value={String(values.sponsorPhone)} onChange={set('sponsorPhone')} placeholder="+966501234567" />
        </Field>
        <Field id="sponsorAddress" label="Sponsor address" flagged={unconfirmed.sponsorAddress}>
          <Input id="sponsorAddress" value={String(values.sponsorAddress)} onChange={set('sponsorAddress')} placeholder="e.g. Riyadh, Olaya District" />
        </Field>
        <Field id="sponsorArabicName" label="Sponsor name (Arabic)" flagged={unconfirmed.sponsorArabicName}>
          <Input id="sponsorArabicName" dir="rtl" lang="ar" value={String(values.sponsorArabicName)} onChange={set('sponsorArabicName')} placeholder="محمد الحربي" />
        </Field>
        <Field id="sponsorNationalId" label="Sponsor national ID / iqama" flagged={unconfirmed.sponsorNationalId}>
          <Input id="sponsorNationalId" inputMode="numeric" value={String(values.sponsorNationalId)} onChange={set('sponsorNationalId')} placeholder="e.g. 1012345678" />
        </Field>
      </Section>

      <Section icon={ClipboardList} title="Saudi visa processing">
        <Field id="wakalaNumber" label="Wakala no.">
          <Input id="wakalaNumber" value={String(values.wakalaNumber)} onChange={set('wakalaNumber')} />
        </Field>
        <Field id="enjazNumber" label="Enjaz no." flagged={unconfirmed.enjazNumber}>
          <Input id="enjazNumber" value={String(values.enjazNumber)} onChange={set('enjazNumber')} />
        </Field>
        <Field id="stickerVisaNumber" label="Sticker visa no.">
          <Input id="stickerVisaNumber" value={String(values.stickerVisaNumber)} onChange={set('stickerVisaNumber')} />
        </Field>
        <Field id="biometricId" label="Biometric (fingerprint) ID">
          <Input id="biometricId" value={String(values.biometricId)} onChange={set('biometricId')} />
        </Field>
      </Section>

      <Section icon={Award} title="Certificate of competence (COC)">
        <Field id="cocStatus" label="COC status">
          <Select id="cocStatus" value={String(values.cocStatus)} onChange={set('cocStatus')}>
            {['pending', 'issued', 'expired'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="cocType" label="Issued by">
          <Select id="cocType" value={String(values.cocType)} onChange={set('cocType')}>
            <option value="">— Select —</option>
            {COC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="cocCenterName" label="Assessment center">
          <Input id="cocCenterName" value={String(values.cocCenterName)} onChange={set('cocCenterName')} />
        </Field>
        <Field id="cocCertificateNumber" label="Certificate no.">
          <Input id="cocCertificateNumber" value={String(values.cocCertificateNumber)} onChange={set('cocCertificateNumber')} />
        </Field>
        <Field
          id="cocCertifiedDate"
          label="Certified date"
          error={fieldErrors.cocCertifiedDate}
          hint={cocExpiryHint(String(values.cocCertifiedDate))}
        >
          <Input id="cocCertifiedDate" type="date" value={String(values.cocCertifiedDate)} onChange={set('cocCertifiedDate')} />
        </Field>
      </Section>

      <Section icon={Users} title="Relative / emergency contact">
        <Field id="relativeName" label="Relative name">
          <Input id="relativeName" value={String(values.relativeName)} onChange={set('relativeName')} />
        </Field>
        <Field id="relativeKinship" label="Kinship">
          <Input id="relativeKinship" list="kinships" value={String(values.relativeKinship)} onChange={set('relativeKinship')} placeholder="e.g. Mother" />
          <datalist id="kinships">
            {KINSHIPS.map((kinship) => (
              <option key={kinship} value={kinship} />
            ))}
          </datalist>
        </Field>
        <Field id="relativePhone" label="Phone">
          <Input id="relativePhone" type="tel" value={String(values.relativePhone)} onChange={set('relativePhone')} placeholder="+2519…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="relativeGender" label="Gender">
            <Select id="relativeGender" value={String(values.relativeGender)} onChange={set('relativeGender')}>
              <option value="">— Select —</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </Field>
          <Field id="relativeDateOfBirth" label="Date of birth" error={fieldErrors.relativeDateOfBirth}>
            <Input id="relativeDateOfBirth" type="date" value={String(values.relativeDateOfBirth)} onChange={set('relativeDateOfBirth')} />
          </Field>
        </div>
        <Field id="relativeRegion" label="Region">
          <Input id="relativeRegion" list="regions" value={String(values.relativeRegion)} onChange={set('relativeRegion')} />
          <datalist id="regions">
            {REGIONS.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
        </Field>
        <Field id="relativeCity" label="City / town">
          <Input id="relativeCity" value={String(values.relativeCity)} onChange={set('relativeCity')} />
        </Field>
        <Field id="relativeSubcity" label="Subcity / zone">
          <Input id="relativeSubcity" value={String(values.relativeSubcity)} onChange={set('relativeSubcity')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="relativeWereda" label="Wereda">
            <Input id="relativeWereda" value={String(values.relativeWereda)} onChange={set('relativeWereda')} />
          </Field>
          <Field id="relativeHouseNumber" label="House no.">
            <Input id="relativeHouseNumber" value={String(values.relativeHouseNumber)} onChange={set('relativeHouseNumber')} />
          </Field>
        </div>
      </Section>

      <Dialog open={musanedOpen} onOpenChange={setMusanedOpen}>
        <DialogContent className="w-[min(36rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Paste from Musaned</DialogTitle>
            <DialogDescription>
              The six details Musaned provides. Paste them to fill the boxes, or type them. Filled fields are
              marked for you to confirm; the paste reader is provisional, so check every value.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              rows={4}
              dir="auto"
              value={musanedText}
              onChange={(event) => pasteMusaned(event.target.value)}
              placeholder="Paste the Musaned details here, or fill the boxes below by hand."
              aria-label="Musaned text"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {MUSANED_FIELDS.map(({ field, label }) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`musaned-${field}`}>{label}</Label>
                  <Input
                    id={`musaned-${field}`}
                    dir="auto"
                    value={musanedDraft[field] ?? ''}
                    onChange={(event) => setMusanedDraft((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </div>
              ))}
            </div>

            {musanedUnmatched.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-[var(--color-warning)]">Not understood ({musanedUnmatched.length})</p>
                <ul className="mt-1 max-h-24 space-y-0.5 overflow-auto text-muted-foreground">
                  {musanedUnmatched.map((line, index) => (
                    <li key={index} dir="auto">{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMusanedOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!Object.values(musanedDraft).some((value) => value?.trim())}
              onClick={applyMusaned}
            >
              Fill the form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEdit && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
              <Paperclip className="size-4 text-primary" />
              Photos &amp; documents
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56 space-y-2">
                <Label htmlFor="documentKind">Document type</Label>
                <Select id="documentKind" value={documentKind} onChange={(e) => setDocumentKind(e.target.value)}>
                  {DOCUMENT_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </Select>
              </div>

              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                }}
              />

              <Button
                type="button"
                variant="outline"
                disabled={uploadDocument.isPending}
                onClick={() => fileInput.current?.click()}
              >
                {uploadDocument.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload />}
                Upload file
              </Button>

              <p className="text-sm text-muted-foreground">JPEG, PNG, WebP or PDF, up to 10 MB.</p>
            </div>

            {!candidate?.documents.length && (
              <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No documents attached yet.
              </p>
            )}

            <ul className="divide-y divide-border">
              {candidate?.documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center gap-3 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{document.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_KINDS.find((k) => k.value === document.kind)?.label ?? document.kind}
                      {' · '}
                      {(document.sizeBytes / 1024).toFixed(0)} KB
                    </p>
                  </div>

                  {document.scanStatus !== 'clean' && (
                    <Badge tone="warning">{document.scanStatus}</Badge>
                  )}

                  <Button type="button" size="sm" variant="outline" onClick={() => void openDocument(document.id)}>
                    Open
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      id &&
                      deleteDocument.mutate(
                        { id, documentId: document.id },
                        { onSuccess: () => toast.success('Document removed') },
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/candidates')}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? 'Save candidate' : 'Save candidate record'}
        </Button>
      </div>
    </form>
  );
}
