import { useState } from 'react';
import { Activity, Download, Eye, Loader2, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import {
  useAuditEntityTypes,
  useAuditLog,
  useAuditSummary,
  type AuditEntry,
} from '@/hooks/queries';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'EXPORT', 'IMPERSONATE'];

/** Severity, not decoration: failures and impersonation should catch the eye. */
const ACTION_TONE: Record<string, BadgeProps['tone']> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
  LOGIN: 'success',
  LOGOUT: 'neutral',
  LOGIN_FAILED: 'danger',
  EXPORT: 'warning',
  IMPERSONATE: 'warning',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AuditLogs() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = { search, action, entityType, page };
  const { data, isLoading } = useAuditLog(filters);
  const { data: summary } = useAuditSummary();
  const { data: entityTypes } = useAuditEntityTypes();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const resetFilters = () => {
    setSearch('');
    setAction('all');
    setEntityType('all');
    setPage(1);
  };

  /**
   * The download is fetched with the session's access token rather than opened
   * as a plain link — a link would arrive unauthenticated and return a 401 page
   * saved as a .csv file.
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(action !== 'all' ? { action } : {}),
        ...(entityType !== 'all' ? { entityType } : {}),
      });

      const csv = await api.getText(`/api/v1/audit-logs/export?${query.toString()}`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Audit log exported');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not export the audit log');
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    { label: 'Total events', value: summary?.total ?? 0, icon: Activity, tone: 'primary' as const, note: 'Recorded' },
    { label: 'Active accounts', value: summary?.activeAdmins ?? 0, icon: Users, tone: 'success' as const, note: 'Active' },
    { label: 'Last 24 hours', value: summary?.last24h ?? 0, icon: Activity, tone: 'neutral' as const, note: 'Today' },
    {
      label: 'Failed sign-ins',
      value: summary?.securityEvents ?? 0,
      icon: ShieldAlert,
      tone: (summary?.securityEvents ? 'danger' : 'neutral') as BadgeProps['tone'],
      note: 'Monitored',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="mt-1 text-muted-foreground">
          Every action taken in this workspace, who took it and from where.
        </p>
      </div>

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

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-64 flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by person, description or IP address…"
              aria-label="Search the audit log"
            />
          </div>

          <Select
            className="w-48"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replace('_', ' ').toLowerCase()}
              </option>
            ))}
          </Select>

          <Select
            className="w-48"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by record type"
          >
            <option value="all">All record types</option>
            {entityTypes?.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Button variant="ghost" onClick={resetFilters}>
            Reset
          </Button>

          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Timestamp</TH>
              <TH>Action</TH>
              <TH>Performed by</TH>
              <TH>Record</TH>
              <TH>IP address</TH>
              <TH className="text-end">Details</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={6}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !data?.items.length && (
              <EmptyRow colSpan={6}>Nothing matches these filters.</EmptyRow>
            )}

            {data?.items.map((entry) => (
              <TR key={entry.id}>
                <TD className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                  {formatTimestamp(entry.createdAt)}
                </TD>
                <TD>
                  <Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>
                    {entry.action.replace('_', ' ').toLowerCase()}
                  </Badge>
                </TD>
                <TD>
                  <span className="font-medium">{entry.actorName}</span>
                  {entry.actorUsername && (
                    <span className="block text-xs text-muted-foreground">{entry.actorUsername}</span>
                  )}
                </TD>
                <TD>
                  <span className="font-medium">{entry.entityType}</span>
                  {entry.entityLabel && (
                    <span className="text-muted-foreground"> — {entry.entityLabel}</span>
                  )}
                </TD>
                <TD className="font-mono text-xs text-muted-foreground">{entry.clientIp ?? '—'}</TD>
                <TD className="text-end">
                  <Button size="sm" variant="outline" onClick={() => setSelected(entry)}>
                    <Eye />
                    View
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {totalPages} · {data.total} events
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit trail details</DialogTitle>
            <DialogDescription>
              {selected && formatTimestamp(selected.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </dt>
                  <dd className="mt-1">
                    <Badge tone={ACTION_TONE[selected.action] ?? 'neutral'}>
                      {selected.action.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Performed by
                  </dt>
                  <dd className="mt-1 font-medium">
                    {selected.actorName}
                    {selected.actorUsername && (
                      <span className="block text-sm font-normal text-muted-foreground">
                        {selected.actorUsername}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Record
                  </dt>
                  <dd className="mt-1 font-medium">
                    {selected.entityType}
                    {selected.entityLabel && ` — ${selected.entityLabel}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    IP address
                  </dt>
                  <dd className="mt-1 font-mono text-sm">{selected.clientIp ?? '—'}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What happened
                </p>
                <p className="rounded-md bg-secondary px-4 py-3 text-sm">{selected.description}</p>
              </div>

              {Boolean(selected.diff) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What changed
                  </p>
                  <pre className="max-h-72 overflow-auto rounded-md bg-sidebar p-4 text-xs leading-relaxed text-sidebar-foreground">
                    {JSON.stringify(selected.diff, null, 2)}
                  </pre>
                </div>
              )}

              {selected.userAgent && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Browser
                  </p>
                  <p className="break-words text-sm text-muted-foreground">{selected.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
