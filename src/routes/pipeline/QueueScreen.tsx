import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { AdvanceDialog } from '@/components/AdvanceDialog';
import { useAuth } from '@/app/auth';
import {
  EMPTY_QUEUE_FILTERS,
  useQueue,
  useStatuses,
  type QueueFilters,
  type QueueRow,
} from '@/hooks/queries';
import type { Permission } from '@alm/sdk';

export interface QueueColumn {
  key: string;
  label: string;
  render: (row: QueueRow) => React.ReactNode;
}

export interface QueueScreenProps {
  queue: 'lmis' | 'embassy' | 'tickets' | 'issued' | 'departed' | 'returned';
  title: string;
  description: string;
  emptyMessage: string;
  /** Which status catalogue drives this screen's status filter, if any. */
  statusCategory?: 'lmis' | 'embassy' | 'ticket';
  columns: QueueColumn[];
  advancePermission: Permission;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

const MEDICAL_TONE: Record<string, BadgeProps['tone']> = {
  fit: 'success',
  pending: 'warning',
  unfit: 'danger',
  expired: 'neutral',
};

/**
 * Shared shape for all six pipeline queues.
 *
 * They differ only in their columns and which status catalogue filters them, so
 * they are one component rather than six near-copies — a change to how a queue
 * behaves should not have to be made six times.
 */
export function QueueScreen(props: QueueScreenProps) {
  const { can } = useAuth();
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_QUEUE_FILTERS);
  const [moving, setMoving] = useState<QueueRow | null>(null);

  const { data, isLoading } = useQueue(props.queue, filters);
  const { data: statuses } = useStatuses(props.statusCategory);

  const canAdvance = can(props.advancePermission);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const set = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{props.title}</h1>
        <p className="mt-1 text-muted-foreground">{props.description}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-60 flex-1">
            <Input
              value={filters.search}
              onChange={(event) => set('search', event.target.value)}
              placeholder="Search name, passport, labour ID or visa number…"
              aria-label={`Search ${props.title}`}
            />
          </div>

          {props.statusCategory && (
            <Select
              className="w-48"
              value={filters.statusId}
              onChange={(event) => set('statusId', event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {statuses?.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
          )}

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

          <Button variant="ghost" onClick={() => setFilters(EMPTY_QUEUE_FILTERS)}>
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
              {props.columns.map((column) => (
                <TH key={column.key}>{column.label}</TH>
              ))}
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={props.columns.length + 3}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !data?.items.length && (
              <EmptyRow colSpan={props.columns.length + 3}>{props.emptyMessage}</EmptyRow>
            )}

            {data?.items.map((row) => (
              <TR key={row.id}>
                <TD>
                  <Link to={`/candidates/${row.id}`} className="font-medium hover:underline">
                    {row.fullName}
                  </Link>
                  {row.destinationCountry && (
                    <span className="block text-xs text-muted-foreground">
                      → {row.destinationCountry}
                    </span>
                  )}
                </TD>
                <TD className="font-mono text-xs">{row.passportNumber}</TD>

                {props.columns.map((column) => (
                  <TD key={column.key}>{column.render(row)}</TD>
                ))}

                <TD className="text-end">
                  {canAdvance && (
                    <Button size="sm" variant="outline" onClick={() => setMoving(row)}>
                      <ArrowRight />
                      Move
                    </Button>
                  )}
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

      <AdvanceDialog candidate={moving} onClose={() => setMoving(null)} />
    </div>
  );
}

/* ------------------------------------------------------ the six queue screens */

const statusCell = (value: { name: string } | null) =>
  value ? <Badge tone="primary">{value.name}</Badge> : <span className="text-muted-foreground">—</span>;

export function LmisQueue() {
  return (
    <QueueScreen
      queue="lmis"
      title="LMIS pipeline"
      description="Candidates filed with the labour ministry, and where each filing has got to."
      emptyMessage="No candidates are currently with the labour ministry."
      statusCategory="lmis"
      advancePermission="lmis:edit"
      columns={[
        { key: 'labourId', label: 'Labour ID', render: (row) => <span className="font-mono text-xs">{row.labourId}</span> },
        { key: 'destination', label: 'Destination', render: (row) => row.destinationCountry ?? '—' },
        { key: 'status', label: 'LMIS status', render: (row) => statusCell(row.lmisStatus) },
      ]}
    />
  );
}

export function EmbassyQueue() {
  return (
    <QueueScreen
      queue="embassy"
      title="Embassy pipeline"
      description="Candidates awaiting destination approval, and those whose visa has come through."
      emptyMessage="No candidates are currently with an embassy."
      statusCategory="embassy"
      advancePermission="embassy:edit"
      columns={[
        { key: 'visa', label: 'Visa number', render: (row) => row.visaNumber ? <span className="font-mono text-xs">{row.visaNumber}</span> : '—' },
        { key: 'visaDate', label: 'Visa date', render: (row) => formatDate(row.visaDate) },
        { key: 'status', label: 'Embassy status', render: (row) => statusCell(row.embassyStatus) },
      ]}
    />
  );
}

export function TicketsQueue() {
  return (
    <QueueScreen
      queue="tickets"
      title="Flight tickets"
      description="Candidates cleared to travel who still need a ticket."
      emptyMessage="No candidates are currently waiting for a ticket."
      statusCategory="ticket"
      advancePermission="tickets:edit"
      columns={[
        { key: 'destination', label: 'Destination', render: (row) => row.destinationCountry ?? '—' },
        { key: 'visa', label: 'Visa number', render: (row) => row.visaNumber ? <span className="font-mono text-xs">{row.visaNumber}</span> : '—' },
        { key: 'medical', label: 'Medical', render: (row) => <Badge tone={MEDICAL_TONE[row.medicalStatus] ?? 'neutral'}>{row.medicalStatus}</Badge> },
      ]}
    />
  );
}

export function IssuedTicketsQueue() {
  return (
    <QueueScreen
      queue="issued"
      title="Issued tickets"
      description="Tickets already issued, waiting on departure."
      emptyMessage="No tickets have been issued yet."
      statusCategory="ticket"
      advancePermission="tickets:edit"
      columns={[
        { key: 'destination', label: 'Destination', render: (row) => row.destinationCountry ?? '—' },
        { key: 'ticketDate', label: 'Ticket date', render: (row) => formatDate(row.flightTicketDate) },
        { key: 'status', label: 'Ticket status', render: (row) => statusCell(row.ticketStatus) },
      ]}
    />
  );
}

export function DepartedQueue() {
  return (
    <QueueScreen
      queue="departed"
      title="Departed list"
      description="Candidates currently working abroad."
      emptyMessage="Nobody is currently deployed overseas."
      advancePermission="deployments:edit"
      columns={[
        { key: 'destination', label: 'Destination', render: (row) => row.destinationCountry ?? '—' },
        { key: 'office', label: 'Sponsor / office', render: (row) => row.office?.name ?? '—' },
        { key: 'departure', label: 'Departure date', render: (row) => formatDate(row.departureDate) },
      ]}
    />
  );
}

const RETURN_LABEL: Record<string, string> = {
  contract_completed: 'Contract completed',
  contract_terminated: 'Terminated early',
  medical: 'Medical',
  employer_issue: 'Employer problem',
  absconded: 'Left employer',
  deported: 'Deported',
  other: 'Other',
};

export function ReturnedQueue() {
  return (
    <QueueScreen
      queue="returned"
      title="Returned list"
      description="Candidates who have come home, and why."
      emptyMessage="No returns have been recorded."
      advancePermission="returns:edit"
      columns={[
        { key: 'return', label: 'Return date', render: (row) => formatDate(row.returnDate) },
        {
          key: 'reason',
          label: 'Reason',
          render: (row) =>
            row.returnReason ? (
              <Badge tone={row.returnReason === 'contract_completed' ? 'success' : 'warning'}>
                {RETURN_LABEL[row.returnReason] ?? row.returnReason}
              </Badge>
            ) : (
              '—'
            ),
        },
        { key: 'destination', label: 'Was in', render: (row) => row.destinationCountry ?? '—' },
      ]}
    />
  );
}
