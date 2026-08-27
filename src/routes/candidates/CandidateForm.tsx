import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  ClipboardList,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  UserRound,
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

type Values = Record<string, string | boolean>;

const BLANK: Values = {
  fullName: '',
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
  currentOccupation: '',
  educationLevel: '',
  englishLevel: '',
  arabicLevel: '',
  workedAbroad: false,
  skillsNotes: '',
  postAppliedFor: '',
  applicationId: '',
  labourId: '',
  selectionStatus: 'Pending',
  medicalStatus: 'pending',
  medicalIssueDate: '',
  visaNumber: '',
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
};

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

  const { isFlagEnabled } = useAuth();
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
        typeof value === 'boolean'
          ? value
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

        <Field id="visaNumber" label="Visa number">
          <Input id="visaNumber" value={String(values.visaNumber)} onChange={set('visaNumber')} placeholder="Optional until issued" />
        </Field>

        <Field id="visaDate" label="Visa date">
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

      <Section icon={FileText} title="Sponsor details">
        <Field id="sponsorName" label="Sponsor name">
          <Input id="sponsorName" value={String(values.sponsorName)} onChange={set('sponsorName')} placeholder="e.g. MOHAMMED AL-HARBI" />
        </Field>
        <Field id="sponsorRef" label="Sponsor ID">
          <Input id="sponsorRef" value={String(values.sponsorRef)} onChange={set('sponsorRef')} placeholder="e.g. SP-99812" />
        </Field>
        <Field id="sponsorPhone" label="Sponsor phone">
          <Input id="sponsorPhone" value={String(values.sponsorPhone)} onChange={set('sponsorPhone')} placeholder="+966501234567" />
        </Field>
        <Field id="sponsorAddress" label="Sponsor address">
          <Input id="sponsorAddress" value={String(values.sponsorAddress)} onChange={set('sponsorAddress')} placeholder="e.g. Riyadh, Olaya District" />
        </Field>
      </Section>

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
