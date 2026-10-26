import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  Download,
  Loader2,
  Pencil,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAuth } from '@/app/auth';
import { api } from '@/lib/api';
import {
  candidateQuery,
  useAgents,
  useArchiveCandidate,
  useCandidateSummary,
  useCandidates,
  useOffices,
  type CandidateFilters,
  type CandidateRow,
} from '@/hooks/queries';

const MEDICAL_TONE: Record<string, BadgeProps['tone']> = {
  fit: 'success',
  pending: 'warning',
  unfit: 'danger',
  expired: 'neutral',
};

const COC_TONE: Record<string, BadgeProps['tone']> = {
  issued: 'success',
  pending: 'warning',
  expired: 'danger',
};

/** Two weeks is roughly how long it takes to book a COC reassessment. */
const COC_WARNING_DAYS = 14;

function CocBadge({ candidate }: { candidate: CandidateRow }) {
  const daysLeft = candidate.cocExpiryDate
    ? Math.ceil((new Date(candidate.cocExpiryDate).getTime() - Date.now()) / 86_400_000)
    : null;
  const expiringSoon =
    candidate.cocStatus === 'issued' && daysLeft !== null && daysLeft <= COC_WARNING_DAYS;

  return (
    <>
      <Badge tone={expiringSoon ? 'warning' : (COC_TONE[candidate.cocStatus] ?? 'neutral')}>
        {candidate.cocStatus}
      </Badge>
      {expiringSoon && (
        <span className="block text-xs text-warning">
          {daysLeft === 0 ? 'expires today' : `expires in ${daysLeft}d`}
        </span>
      )}
    </>
  );
}

const STAGE_TONE: Record<string, BadgeProps['tone']> = {
  registration: 'neutral',
  medical: 'warning',
  lmis: 'primary',
  embassy: 'primary',
  visa: 'success',
  flight: 'success',
  deployed: 'success',
  returned: 'neutral',
};

const EMPTY: CandidateFilters = {
  search: '',
  officeId: 'all',
  agentId: 'all',
  gender: 'all',
  religion: 'all',
  medicalStatus: 'all',
  cocStatus: 'all',
  archived: false,
  page: 1,
};

export function CandidateDirectory({ archived = false }: { archived?: boolean }) {
  const { can } = useAuth();
  const [filters, setFilters] = useState<CandidateFilters>({ ...EMPTY, archived });
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useCandidates(filters);
  const { data: summary } = useCandidateSummary();
  const { data: offices } = useOffices();
  const { data: agents } = useAgents();
  const archiveCandidate = useArchiveCandidate();

  const canEdit = can('candidates:edit');
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  /** Any filter change returns to page one; staying on page 7 of 2 shows nothing. */
  const set = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  const toggleArchive = (id: string, name: string, isArchived: boolean) => {
    archiveCandidate.mutate(
      { id, archived: isArchived },
      {
        onSuccess: () => toast.success(isArchived ? `${name} restored` : `${name} archived`),
        onError: (caught) =>
          toast.error(caught instanceof ApiError ? caught.message : 'Could not update the record'),
      },
    );
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams(
        Object.entries(candidateQuery(filters)).map(([key, value]) => [key, String(value)]),
      );
      const csv = await api.getText(`/api/v1/candidates/export?${query.toString()}`);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));

      const link = document.createElement('a');
      link.href = url;
      link.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Directory exported');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not export the directory');
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    { label: 'Total candidates', value: summary?.total ?? 0, note: 'Live', tone: 'primary' as const },
    { label: 'In processing', value: summary?.processing ?? 0, note: 'Processing', tone: 'warning' as const },
    { label: 'Visa secured', value: summary?.visaSecured ?? 0, note: 'Secured', tone: 'success' as const },
    { label: 'Active agents', value: summary?.activeAgents ?? 0, note: 'Active', tone: 'neutral' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {archived ? 'Archived candidates' : 'Candidates directory'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {archived
              ? 'Records taken out of the active pipeline. Restoring one puts it back where it was.'
              : 'Filter, export and manage everyone this agency is placing.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
            Export
          </Button>
          {!archived && canEdit && (
            <Button asChild>
              <Link to="/candidates/new">
                <UserPlus />
                Register candidate
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!archived && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{card.value}</p>
                </div>
                <Badge tone={card.tone}>{card.note}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-60 flex-1">
            <Input
              value={filters.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Search name, passport, labour ID or phone…"
              aria-label="Search candidates"
            />
          </div>

          <Select
            className="w-44"
            value={filters.officeId}
            onChange={(event) => set('officeId', event.target.value)}
            aria-label="Filter by office"
          >
            <option value="all">All offices</option>
            {offices?.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </Select>

          <Select
            className="w-44"
            value={filters.agentId}
            onChange={(event) => set('agentId', event.target.value)}
            aria-label="Filter by agent"
          >
            <option value="all">All agents</option>
            {agents?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </Select>

          <Select
            className="w-36"
            value={filters.gender}
            onChange={(event) => set('gender', event.target.value)}
            aria-label="Filter by gender"
          >
            <option value="all">All genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>

          <Select
            className="w-40"
            value={filters.religion}
            onChange={(event) => set('religion', event.target.value)}
            aria-label="Filter by religion"
          >
            <option value="all">All religions</option>
            {['muslim', 'christian', 'orthodox', 'protestant', 'catholic', 'other'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>

          <Select
            className="w-40"
            value={filters.medicalStatus}
            onChange={(event) => set('medicalStatus', event.target.value)}
            aria-label="Filter by medical status"
          >
            <option value="all">Medical status</option>
            {['pending', 'fit', 'unfit', 'expired'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>

          <Select
            className="w-36"
            value={filters.cocStatus}
            onChange={(event) => set('cocStatus', event.target.value)}
            aria-label="Filter by COC status"
          >
            <option value="all">COC status</option>
            {['pending', 'issued', 'expired'].map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>

          <Button variant="ghost" onClick={() => setFilters({ ...EMPTY, archived })}>
            Clear
          </Button>
        </CardContent>
      </Card>

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Candidate</TH>
              <TH>Passport no.</TH>
              <TH>Labour ID</TH>
              <TH>Stage</TH>
              <TH>Medical</TH>
              <TH>COC</TH>
              <TH>Visa</TH>
              <TH>Office / agent</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={9}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !data?.items.length && (
              <EmptyRow colSpan={9}>
                {archived ? (
                  'Nothing has been archived.'
                ) : (
                  <span className="flex flex-col items-center gap-3">
                    <Users className="size-8 text-muted-foreground/60" />
                    No candidates match these filters.
                  </span>
                )}
              </EmptyRow>
            )}

            {data?.items.map((candidate) => (
              <TR key={candidate.id}>
                <TD>
                  <Link to={`/candidates/${candidate.id}`} className="font-medium hover:underline">
                    {candidate.fullName}
                  </Link>
                  {candidate.destinationCountry && (
                    <span className="block text-xs text-muted-foreground">
                      → {candidate.destinationCountry}
                    </span>
                  )}
                </TD>
                <TD className="font-mono text-xs">{candidate.passportNumber}</TD>
                <TD className="font-mono text-xs text-muted-foreground">{candidate.labourId}</TD>
                <TD>
                  <Badge tone={STAGE_TONE[candidate.stage] ?? 'neutral'}>{candidate.stage}</Badge>
                </TD>
                <TD>
                  <Badge tone={MEDICAL_TONE[candidate.medicalStatus] ?? 'neutral'}>
                    {candidate.medicalStatus}
                  </Badge>
                </TD>
                <TD>
                  <CocBadge candidate={candidate} />
                </TD>
                <TD>
                  {candidate.visaNumber ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <ShieldCheck className="size-4 text-success" />
                      <span className="font-mono text-xs">{candidate.visaNumber}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TD>
                <TD className="text-sm text-muted-foreground">
                  {candidate.office?.name ?? '—'}
                  {candidate.agent && (
                    <span className="block text-xs">via {candidate.agent.fullName}</span>
                  )}
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/candidates/${candidate.id}`}>
                          <Pencil />
                          Open
                        </Link>
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={archiveCandidate.isPending}
                        onClick={() =>
                          toggleArchive(candidate.id, candidate.fullName, Boolean(candidate.archivedAt))
                        }
                      >
                        {candidate.archivedAt ? <ArchiveRestore /> : <Archive />}
                        {candidate.archivedAt ? 'Restore' : 'Archive'}
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {totalPages} · {data.total} candidates
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
