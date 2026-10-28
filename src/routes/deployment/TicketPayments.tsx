import { useState, type FormEvent } from 'react';
import { Banknote, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  useDeleteTicketPayment,
  useSaveTicketPayment,
  useTicketPayments,
  type CandidateRef,
  type TicketPayment,
  type TicketPaymentFilters,
} from '@/hooks/queries';

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile money' },
] as const;

const METHOD_LABEL: Record<string, string> = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));

interface Draft {
  id?: string;
  candidate: CandidateRef | null;
  paymentDate: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  ticketOffice: string;
  referenceNumber: string;
  accountNumber: string;
  note: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const blank = (): Draft => ({
  candidate: null,
  paymentDate: today(),
  amount: '',
  currency: 'ETB',
  paymentMethod: 'bank_transfer',
  ticketOffice: '',
  referenceNumber: '',
  accountNumber: '',
  note: '',
});

/** Grouped thousands without ever turning the amount into a float. */
function money(amount: string, currency: string): string {
  const [whole = '0', fraction = '00'] = amount.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0').slice(0, 2)} ${currency}`;
}

export function TicketPayments() {
  const { can } = useAuth();
  const [filters, setFilters] = useState<TicketPaymentFilters>({ search: '', from: '', to: '', page: 1 });
  const { data, isLoading } = useTicketPayments(filters);
  const save = useSaveTicketPayment();
  const remove = useDeleteTicketPayment();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TicketPayment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = can('tickets:edit');
  const canDelete = can('tickets:delete');

  const setFilter = <K extends keyof TicketPaymentFilters>(key: K, value: TicketPaymentFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? (value as number) : 1 }));

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setFormError(null);
    if (!draft.candidate) {
      setFormError('Choose the candidate this payment was for.');
      return;
    }

    try {
      await save.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        candidateId: draft.candidate.id,
        paymentDate: draft.paymentDate,
        amount: draft.amount,
        currency: draft.currency,
        paymentMethod: draft.paymentMethod,
        ticketOffice: draft.ticketOffice,
        referenceNumber: draft.referenceNumber,
        accountNumber: draft.accountNumber,
        note: draft.note,
      });
      toast.success(draft.id ? 'Payment saved' : `Payment recorded for ${draft.candidate.fullName}`);
      setDraft(null);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket payments</h1>
          <p className="mt-1 text-muted-foreground">
            What was paid to ticket offices, and the reference to match it to the bank statement.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDraft(blank())}>
            <Plus />
            Record payment
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <Input
            className="max-w-sm"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
            placeholder="Search by candidate, passport or reference…"
            aria-label="Search payments"
          />
          <div className="space-y-1">
            <Label htmlFor="payments-from" className="text-xs">From</Label>
            <Input id="payments-from" type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payments-to" className="text-xs">To</Label>
            <Input id="payments-to" type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />
          </div>
          {Boolean(data?.totals.length) && (
            <div className="ms-auto text-end">
              <span className="block text-xs uppercase tracking-wide text-muted-foreground">Total shown</span>
              {data!.totals.map((total) => (
                <span key={total.currency} className="block text-lg font-semibold tabular-nums">
                  {money(total.amount, total.currency)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Candidate</TH>
              <TH className="text-end">Amount</TH>
              <TH>Method</TH>
              <TH>Ticket office</TH>
              <TH>Reference</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading && (
              <EmptyRow colSpan={7}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}
            {!isLoading && !data?.items.length && (
              <EmptyRow colSpan={7}>
                <span className="flex flex-col items-center gap-3">
                  <Banknote className="size-8 text-muted-foreground/60" />
                  No ticket payments match.
                </span>
              </EmptyRow>
            )}
            {data?.items.map((payment) => (
              <TR key={payment.id}>
                <TD className="whitespace-nowrap">{new Date(payment.paymentDate).toLocaleDateString()}</TD>
                <TD>
                  <span className="font-medium">{payment.candidate.fullName}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{payment.candidate.passportNumber}</span>
                </TD>
                <TD className="text-end tabular-nums">{money(payment.amount, payment.currency)}</TD>
                <TD>{METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod}</TD>
                <TD className="text-muted-foreground">{payment.ticketOffice ?? '—'}</TD>
                <TD className="font-mono text-xs">{payment.referenceNumber ?? '—'}</TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            id: payment.id,
                            candidate: payment.candidate,
                            paymentDate: payment.paymentDate.slice(0, 10),
                            amount: payment.amount,
                            currency: payment.currency,
                            paymentMethod: payment.paymentMethod,
                            ticketOffice: payment.ticketOffice ?? '',
                            referenceNumber: payment.referenceNumber ?? '',
                            accountNumber: payment.accountNumber ?? '',
                            note: payment.note ?? '',
                          })
                        }
                      >
                        <Pencil />
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPendingDelete(payment)} aria-label="Remove payment">
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
        <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilter('page', page)} />
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="w-[min(34rem,calc(100vw-2rem))]">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Edit ticket payment' : 'Record ticket payment'}</DialogTitle>
              <DialogDescription>A deposit and a balance are two payments.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="payment-candidate">Candidate *</Label>
                <CandidatePicker
                  id="payment-candidate"
                  value={draft?.candidate ?? null}
                  onChange={(candidate) => setDraft((current) => (current ? { ...current, candidate } : current))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment date *</Label>
                <Input id="payment-date" type="date" required value={draft?.paymentDate ?? ''} onChange={set('paymentDate')} />
              </div>
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Amount *</Label>
                  <Input id="payment-amount" inputMode="decimal" required value={draft?.amount ?? ''} onChange={set('amount')} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-currency">Currency</Label>
                  <Select id="payment-currency" value={draft?.currency ?? 'ETB'} onChange={set('currency')}>
                    {['ETB', 'USD', 'SAR'].map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Method *</Label>
                <Select id="payment-method" value={draft?.paymentMethod ?? 'bank_transfer'} onChange={set('paymentMethod')}>
                  {METHODS.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-office">Ticket office</Label>
                <Input id="payment-office" value={draft?.ticketOffice ?? ''} onChange={set('ticketOffice')} placeholder="e.g. Ethiopian Airlines, Bole" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-reference">Reference no.</Label>
                <Input id="payment-reference" value={draft?.referenceNumber ?? ''} onChange={set('referenceNumber')} placeholder="e.g. FT2629912345" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-account">Account no.</Label>
                <Input id="payment-account" value={draft?.accountNumber ?? ''} onChange={set('accountNumber')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="payment-note">Note</Label>
                <Textarea id="payment-note" rows={2} value={draft?.note ?? ''} onChange={set('note')} />
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
                Save payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Remove this payment?</DialogTitle>
            <DialogDescription>
              {pendingDelete &&
                `${money(pendingDelete.amount, pendingDelete.currency)} for ${pendingDelete.candidate.fullName}. It stays in the audit trail.`}
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
                    toast.success('Payment removed');
                    setPendingDelete(null);
                  },
                  onError: (caught) => toast.error(caught instanceof ApiError ? caught.message : 'Could not remove'),
                })
              }
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
