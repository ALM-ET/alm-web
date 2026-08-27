import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdvanceCandidate,
  useStageHistory,
  useTransitions,
  type QueueRow,
} from '@/hooks/queries';

const RETURN_REASONS = [
  { value: 'contract_completed', label: 'Contract completed' },
  { value: 'contract_terminated', label: 'Contract terminated early' },
  { value: 'medical', label: 'Medical grounds' },
  { value: 'employer_issue', label: 'Problem with the employer' },
  { value: 'absconded', label: 'Left the employer' },
  { value: 'deported', label: 'Deported' },
  { value: 'other', label: 'Other' },
];

/**
 * Fields a stage needs collecting at the moment of the move.
 *
 * Asking for them here rather than sending the user back to the candidate form
 * matches how the work happens: someone comes back from the embassy holding a
 * visa number, and records it as part of saying so.
 */
const STAGE_FIELDS: Record<string, { name: string; label: string; type: string; options?: typeof RETURN_REASONS }[]> = {
  lmis: [
    {
      name: 'medicalStatus',
      label: 'Medical result',
      type: 'select',
      options: [
        { value: 'fit', label: 'Fit' },
        { value: 'unfit', label: 'Unfit' },
        { value: 'pending', label: 'Still pending' },
      ],
    },
    { name: 'medicalIssueDate', label: 'Medical issue date', type: 'date' },
  ],
  visa: [
    { name: 'visaNumber', label: 'Visa number', type: 'text' },
    { name: 'visaDate', label: 'Visa date', type: 'date' },
  ],
  flight: [{ name: 'flightTicketDate', label: 'Flight ticket date', type: 'date' }],
  deployed: [{ name: 'departureDate', label: 'Departure date', type: 'date' }],
  returned: [
    { name: 'returnDate', label: 'Return date', type: 'date' },
    { name: 'returnReason', label: 'Reason for returning', type: 'select', options: RETURN_REASONS },
    { name: 'returnNote', label: 'Notes', type: 'textarea' },
  ],
};

export function AdvanceDialog({
  candidate,
  onClose,
}: {
  candidate: QueueRow | null;
  onClose: () => void;
}) {
  const { data: transitions, isLoading } = useTransitions(candidate?.id ?? null);
  const { data: history } = useStageHistory(candidate?.id ?? null);
  const advance = useAdvanceCandidate();

  const [toStage, setToStage] = useState('');
  const [reason, setReason] = useState('');
  const [patch, setPatch] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Default to the natural next step, which is what almost every use is.
  useEffect(() => {
    if (transitions?.next) setToStage(transitions.next);
  }, [transitions?.next]);

  useEffect(() => {
    if (!candidate) {
      setToStage('');
      setReason('');
      setPatch({});
      setError(null);
    }
  }, [candidate]);

  const selected = useMemo(
    () => transitions?.options.find((option) => option.stage === toStage),
    [transitions, toStage],
  );

  const fields = STAGE_FIELDS[toStage] ?? [];
  const goingBack = selected?.direction === 'backward';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!candidate || !toStage) return;
    setError(null);

    try {
      await advance.mutateAsync({
        id: candidate.id,
        toStage,
        ...(reason ? { reason } : {}),
        ...(Object.keys(patch).length ? { patch } : {}),
      });
      toast.success(
        goingBack
          ? `${candidate.fullName} moved back to ${selected?.label}`
          : `${candidate.fullName} advanced to ${selected?.label}`,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not move this candidate.');
    }
  };

  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Move {candidate?.fullName}</DialogTitle>
            <DialogDescription>
              Currently at <span className="font-medium">{transitions?.stage ?? candidate?.stage}</span>.
              Recording the move here is what puts them in the next queue.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="toStage">Move to</Label>
                <Select id="toStage" value={toStage} onChange={(event) => setToStage(event.target.value)}>
                  <option value="">— Choose a stage —</option>
                  {transitions?.options.map((option) => (
                    <option key={option.stage} value={option.stage} disabled={!option.permitted}>
                      {option.label}
                      {option.direction === 'backward' ? ' (back)' : ''}
                      {option.permitted ? '' : ' — no permission'}
                    </option>
                  ))}
                </Select>
              </div>

              {selected?.problem && !goingBack && (
                <p className="flex items-start gap-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {selected.problem}
                </p>
              )}

              {selected && selected.missing.length > 0 && (
                <div className="rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4" />
                    Still needed before this move
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {selected.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-warning/80">
                    Fill them in below and they will be saved with the move.
                  </p>
                </div>
              )}

              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      id={field.name}
                      value={patch[field.name] ?? ''}
                      onChange={(event) =>
                        setPatch((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    >
                      <option value="">— Select —</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      value={patch[field.name] ?? ''}
                      onChange={(event) =>
                        setPatch((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      value={patch[field.name] ?? ''}
                      onChange={(event) =>
                        setPatch((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  )}
                </div>
              ))}

              {goingBack && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Why are they going back? *</Label>
                  <Textarea
                    id="reason"
                    required
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="e.g. Visa refused — reapplying with corrected sponsor details"
                  />
                  <p className="text-sm text-muted-foreground">
                    A reversal without a reason is unreadable six months later.
                  </p>
                </div>
              )}

              {history && history.length > 0 && (
                <details className="rounded-md border border-border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Stage history ({history.length})
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {history.map((event) => (
                      <li key={event.id} className="flex flex-wrap items-center gap-2">
                        {event.fromStage ? (
                          <Badge tone="outline">
                            {event.fromStage} <ArrowRight className="size-3" /> {event.toStage}
                          </Badge>
                        ) : (
                          <Badge tone="outline">{event.toStage}</Badge>
                        )}
                        <span className="text-muted-foreground">
                          {event.actorName} · {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                        {event.reason && (
                          <span className="w-full text-xs text-muted-foreground">“{event.reason}”</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {error && (
                <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={advance.isPending || !toStage || !selected?.permitted}>
              {advance.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : goingBack ? (
                <Undo2 />
              ) : (
                <ArrowRight />
              )}
              {goingBack ? 'Move back' : 'Advance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
