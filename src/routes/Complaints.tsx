import { useState, type FormEvent } from 'react';
import { Download, Loader2, MessageSquareWarning, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { CandidatePicker } from '@/components/CandidatePicker';
import { useAuth } from '@/app/auth';
import { api } from '@/lib/api';
import {
  complaintQuery,
  useComplaints,
  useDeleteComplaint,
  useSaveComplaint,
  type CandidateRef,
  type Complaint,
  type ComplaintFilters,
  type ComplaintStatus,
} from '@/hooks/queries';

const STATUS_TONE: Record<ComplaintStatus, BadgeProps['tone']> = {
  open: 'danger',
  resolved: 'success',
  closed: 'neutral',
};

const TABS: { value: ComplaintFilters['status']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

/** The ones agencies see most; anything else can be typed. */
const TYPES = [
  'Unpaid salary',
  'Mistreatment',
  'Overwork',
  'Contract dispute',
  'Health',
  'Wants to return',
  'No contact with family',
  'Employer complaint',
];

interface Draft {
  id?: string;
  candidate: CandidateRef | null;
  complaintDate: string;
  type: string;
  description: string;
  reportedBy: string;
  status: ComplaintStatus;
  resolution: string;
}

const blank = (): Draft => ({
  candidate: null,
  complaintDate: new Date().toISOString().slice(0, 10),
  type: '',
  description: '',
  reportedBy: '',
  status: 'open',
  resolution: '',
});

export function Complaints() {
  const { can } = useAuth();
  const [filters, setFilters] = useState<ComplaintFilters>({ status: 'open', search: '', page: 1 });
  const { data, isLoading } = useComplaints(filters);
  const save = useSaveComplaint();
  const remove = useDeleteComplaint();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Complaint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canEdit = can('candidates:edit');
  const canDelete = can('candidates:delete');

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setFormError(null);
    if (!draft.candidate) {
      setFormError('Choose the candidate the complaint is about.');
      return;
    }

    try {
      await save.mutateAsync({
        ...(draft.id ? { id: draft.id } : { candidateId: draft.candidate.id }),
        complaintDate: draft.complaintDate,
        type: draft.type,
        description: draft.description,
        reportedBy: draft.reportedBy,
        status: draft.status,
        resolution: draft.resolution,
      });
      toast.success(draft.id ? 'Complaint saved' : `Complaint logged for ${draft.candidate.fullName}`);
      setDraft(null);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await api.getText('/api/v1/complaints/export.csv', {
        query: { ...complaintQuery(filters), page: undefined },
      });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
          <p className="mt-1 text-muted-foreground">
            Problems raised about a placement, by the worker, the family or the employer, and what was done.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Export report
          </Button>
          {canEdit && (
            <Button onClick={() => setDraft(blank())}>
              <Plus />
              Log complaint
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border p-1" role="tablist">
          {TABS.map((tab) => (
            <Button
              key={tab.value}
              role="tab"
              aria-selected={filters.status === tab.value}
              size="sm"
              variant={filters.status === tab.value ? 'default' : 'ghost'}
              onClick={() => setFilters((current) => ({ ...current, status: tab.value, page: 1 }))}
            >
              {tab.label}
              {tab.value !== 'all' && data && (
                <span className="ms-1 tabular-nums opacity-70">{data.counts[tab.value]}</span>
              )}
            </Button>
          ))}
        </div>
        <Input
          className="max-w-sm"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
          placeholder="Search by candidate, passport, type or text…"
          aria-label="Search complaints"
        />
      </div>

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Raised</TH>
              <TH>Candidate</TH>
              <TH>Type</TH>
              <TH>Reported by</TH>
              <TH>Status</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading && (
              <EmptyRow colSpan={6}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}
            {!isLoading && !data?.items.length && (
              <EmptyRow colSpan={6}>
                <span className="flex flex-col items-center gap-3">
                  <MessageSquareWarning className="size-8 text-muted-foreground/60" />
                  {filters.status === 'open' ? 'No open complaints.' : 'No complaints match.'}
                </span>
              </EmptyRow>
            )}
            {data?.items.map((complaint) => (
              <TR key={complaint.id}>
                <TD className="whitespace-nowrap">{new Date(complaint.complaintDate).toLocaleDateString()}</TD>
                <TD>
                  <span className="font-medium">{complaint.candidate.fullName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[complaint.candidate.destinationCountry, complaint.candidate.sponsorName].filter(Boolean).join(' · ') ||
                      complaint.candidate.passportNumber}
                  </span>
                </TD>
                <TD>
                  <span className="font-medium">{complaint.type}</span>
                  <span className="block max-w-xs truncate text-xs text-muted-foreground">{complaint.description}</span>
                </TD>
                <TD className="text-muted-foreground">{complaint.reportedBy ?? '—'}</TD>
                <TD>
                  <Badge tone={STATUS_TONE[complaint.status]}>{complaint.status}</Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            id: complaint.id,
                            candidate: complaint.candidate,
                            complaintDate: complaint.complaintDate.slice(0, 10),
                            type: complaint.type,
                            description: complaint.description,
                            reportedBy: complaint.reportedBy ?? '',
                            status: complaint.status,
                            resolution: complaint.resolution ?? '',
                          })
                        }
                      >
                        <Pencil />
                        Open
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPendingDelete(complaint)} aria-label="Remove complaint">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      {data && (
        <Pager
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="w-[min(34rem,calc(100vw-2rem))]">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Complaint' : 'Log complaint'}</DialogTitle>
              <DialogDescription>
                {draft?.id ? 'Update the status and record what was done.' : 'Logged as open until somebody resolves it.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="complaint-candidate">Candidate *</Label>
                <CandidatePicker
                  id="complaint-candidate"
                  value={draft?.candidate ?? null}
                  disabled={Boolean(draft?.id)}
                  onChange={(candidate) => setDraft((current) => (current ? { ...current, candidate } : current))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-date">Date raised *</Label>
                <Input id="complaint-date" type="date" required value={draft?.complaintDate ?? ''} onChange={set('complaintDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-type">Type *</Label>
                <Input id="complaint-type" list="complaint-types" required value={draft?.type ?? ''} onChange={set('type')} />
                <datalist id="complaint-types">
                  {TYPES.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="complaint-description">What happened *</Label>
                <Textarea id="complaint-description" rows={3} required value={draft?.description ?? ''} onChange={set('description')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-reporter">Reported by</Label>
                <Input id="complaint-reporter" value={draft?.reportedBy ?? ''} onChange={set('reportedBy')} placeholder="e.g. Mother, employer, the worker" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-status">Status</Label>
                <Select id="complaint-status" value={draft?.status ?? 'open'} onChange={set('status')}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="complaint-resolution">Resolution</Label>
                <Textarea id="complaint-resolution" rows={2} value={draft?.resolution ?? ''} onChange={set('resolution')} placeholder="What the agency did" />
              </div>

              {formError && (
                <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-2">
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Save complaint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Remove this complaint?</DialogTitle>
            <DialogDescription>
              {pendingDelete && `"${pendingDelete.type}" for ${pendingDelete.candidate.fullName}. It stays in the audit trail.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                pendingDelete &&
                remove.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success('Complaint removed');
                    setPendingDelete(null);
                  },
                  onError: (caught) => toast.error(caught instanceof ApiError ? caught.message : 'Could not remove'),
                })
              }
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
