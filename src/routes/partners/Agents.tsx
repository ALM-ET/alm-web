import { useState, type FormEvent } from 'react';
import { Loader2, MapPin, Pencil, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
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
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAuth } from '@/app/auth';
import { useAgents, useDeleteAgent, useSaveAgent, type FieldAgent } from '@/hooks/queries';
import { initials } from '@/lib/utils';

interface Draft {
  id?: string;
  fullName: string;
  phone: string;
  region: string;
}

const BLANK: Draft = { fullName: '', phone: '', region: '' };

export function Agents() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const { data: agents, isLoading } = useAgents();
  const saveAgent = useSaveAgent();
  const deleteAgent = useDeleteAgent();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FieldAgent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = can('agents:edit');
  const canDelete = can('agents:delete');

  // The list is short enough that filtering in the browser beats a round trip
  // on every keystroke.
  const visible = agents?.filter((agent) => {
    if (!search) return true;
    const haystack = `${agent.fullName} ${agent.phone ?? ''} ${agent.region ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setFormError(null);

    try {
      await saveAgent.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        fullName: draft.fullName,
        phone: draft.phone,
        region: draft.region,
      });
      toast.success(draft.id ? `Saved ${draft.fullName}` : `${draft.fullName} added`);
      setDraft(null);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    }
  };

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Local agents</h1>
          <p className="mt-1 text-muted-foreground">
            The people sourcing candidates in each region.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDraft(BLANK)}>
            <Plus />
            Add field agent
          </Button>
        )}
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search agents by name, phone or region…"
        aria-label="Search agents"
        className="max-w-md"
      />

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Agent</TH>
              <TH>Phone number</TH>
              <TH>Region</TH>
              <TH>Candidates</TH>
              <TH>Registered</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={6}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !visible?.length && (
              <EmptyRow colSpan={6}>
                <span className="flex flex-col items-center gap-3">
                  <UserRound className="size-8 text-muted-foreground/60" />
                  {search ? `Nothing matches “${search}”.` : 'No field agents yet.'}
                </span>
              </EmptyRow>
            )}

            {visible?.map((agent) => (
              <TR key={agent.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {initials(agent.fullName)}
                    </span>
                    <span className="font-medium">{agent.fullName}</span>
                  </div>
                </TD>
                <TD className="text-muted-foreground">
                  {agent.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      {agent.phone}
                    </span>
                  ) : (
                    '—'
                  )}
                </TD>
                <TD className="text-muted-foreground">
                  {agent.region ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {agent.region}
                    </span>
                  ) : (
                    '—'
                  )}
                </TD>
                <TD className="tabular-nums">{agent.candidateCount}</TD>
                <TD className="text-muted-foreground">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            id: agent.id,
                            fullName: agent.fullName,
                            phone: agent.phone ?? '',
                            region: agent.region ?? '',
                          })
                        }
                      >
                        <Pencil />
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setPendingDelete(agent)}
                      >
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

      <Dialog open={Boolean(draft)} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Edit field agent' : 'Add field agent'}</DialogTitle>
              <DialogDescription>
                Agents appear on each candidate they source, and in the directory filters.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent full name *</Label>
                <Input id="agent-name" required value={draft?.fullName ?? ''} onChange={set('fullName')} placeholder="e.g. Mohammed Bekele" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-phone">Phone number</Label>
                <Input id="agent-phone" value={draft?.phone ?? ''} onChange={set('phone')} placeholder="e.g. +251 911 234 567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-region">Address / sourcing region</Label>
                <Input id="agent-region" value={draft?.region ?? ''} onChange={set('region')} placeholder="e.g. Hawassa, Sidama Region" />
              </div>

              {formError && (
                <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveAgent.isPending}>
                {saveAgent.isPending && <Loader2 className="size-4 animate-spin" />}
                Save agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.fullName}?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.candidateCount
                ? `The ${pendingDelete.candidateCount} candidates they sourced keep the reference.`
                : 'They have not sourced any candidates yet.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAgent.isPending}
              onClick={() =>
                pendingDelete &&
                deleteAgent.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success(`Deleted ${pendingDelete.fullName}`);
                    setPendingDelete(null);
                  },
                  onError: (caught) =>
                    toast.error(caught instanceof ApiError ? caught.message : 'Could not delete'),
                })
              }
            >
              {deleteAgent.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
