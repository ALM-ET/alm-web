import { useState, type FormEvent } from 'react';
import { GripVertical, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LicencePanel } from '@/components/LicencePanel';
import { useDeleteStatus, useSaveStatus, useStatuses, type StatusDefinition } from '@/hooks/queries';
import { cn } from '@/lib/utils';

type Category = 'lmis' | 'embassy' | 'ticket';

const CATEGORIES: { key: Category; label: string; description: string }[] = [
  { key: 'lmis', label: 'LMIS statuses', description: 'Progress of a filing with the labour ministry.' },
  { key: 'embassy', label: 'Embassy statuses', description: 'Progress of a destination approval.' },
  { key: 'ticket', label: 'Ticket statuses', description: 'Progress of a flight booking.' },
];

interface Draft {
  id?: string;
  category: Category;
  name: string;
  position: string;
  isDefault: boolean;
}

/**
 * System settings.
 *
 * M3 delivers the status catalogue — the part of this screen that changes how
 * the pipelines behave. Company branding and the mail server arrive in M4 and
 * are shown here as what they are rather than as empty tabs.
 */
export function SystemSettings() {
  const { can } = useAuth();
  const [category, setCategory] = useState<Category>('lmis');
  const { data: statuses, isLoading } = useStatuses(category);
  const saveStatus = useSaveStatus();
  const deleteStatus = useDeleteStatus();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = can('statuses:edit');
  const canDelete = can('statuses:delete');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setFormError(null);

    try {
      await saveStatus.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        category: draft.category,
        name: draft.name,
        position: Number(draft.position) || 0,
        isDefault: draft.isDefault,
      });
      toast.success(draft.id ? `Saved “${draft.name}”` : `Added “${draft.name}”`);
      setDraft(null);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not save that status.');
    }
  };

  const remove = (status: StatusDefinition) =>
    deleteStatus.mutate(status.id, {
      onSuccess: () => toast.success(`Deleted “${status.name}”`),
      onError: (caught) =>
        toast.error(caught instanceof ApiError ? caught.message : 'Could not delete that status'),
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System settings</h1>
        <p className="mt-1 text-muted-foreground">
          How this agency's pipelines are labelled and how the workspace behaves.
        </p>
      </div>

      {/* Absent entirely on the hosted platform, where there is no licence to
          manage; it renders nothing there rather than showing an empty panel. */}
      <LicencePanel />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Candidate processing statuses</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define the progress labels each pipeline uses. Adding one here makes it available to
            the pipeline screens straight away — no release needed.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((entry) => (
                <Button
                  key={entry.key}
                  variant={category === entry.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(entry.key)}
                >
                  {entry.label}
                </Button>
              ))}
            </div>

            {canEdit && (
              <Button
                size="sm"
                onClick={() =>
                  setDraft({ category, name: '', position: String(statuses?.length ?? 0), isDefault: false })
                }
              >
                <Plus />
                Add status
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {CATEGORIES.find((entry) => entry.key === category)?.description}
          </p>

          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Order</TH>
                  <TH>Status name</TH>
                  <TH>Applied on entry</TH>
                  <TH className="text-end">Actions</TH>
                </TR>
              </THead>

              <TBody>
                {isLoading && (
                  <EmptyRow colSpan={4}>
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </EmptyRow>
                )}

                {!isLoading && !statuses?.length && (
                  <EmptyRow colSpan={4}>No statuses defined for this pipeline yet.</EmptyRow>
                )}

                {statuses?.map((status) => (
                  <TR key={status.id}>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <GripVertical className="size-4" />
                        <span className="tabular-nums">{status.position}</span>
                      </span>
                    </TD>
                    <TD className="font-medium">{status.name}</TD>
                    <TD>
                      {status.isDefault ? (
                        <Badge tone="success">
                          <Star className="size-3" />
                          Default
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDraft({
                                id: status.id,
                                category: status.category,
                                name: status.name,
                                position: String(status.position),
                                isDefault: status.isDefault,
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
                            disabled={deleteStatus.isPending}
                            onClick={() => remove(status)}
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
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Company profile, branding and mail server</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Agency name, logo, colours and the outgoing mail server arrive in M4, alongside the
          logo-driven palette and the module switches.
        </CardContent>
      </Card>

      <Dialog open={Boolean(draft)} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Edit status' : 'Add status'}</DialogTitle>
              <DialogDescription>
                It appears in the {CATEGORIES.find((c) => c.key === draft?.category)?.label.toLowerCase()} filter
                as soon as you save.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-name">Status name *</Label>
                <Input
                  id="status-name"
                  required
                  value={draft?.name ?? ''}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                  }
                  placeholder="e.g. Awaiting ministry fee"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-position">Display order</Label>
                <Input
                  id="status-position"
                  type="number"
                  min={0}
                  value={draft?.position ?? '0'}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, position: event.target.value } : current))
                  }
                />
              </div>

              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3',
                  draft?.isDefault && 'border-primary bg-primary/5',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={draft?.isDefault ?? false}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, isDefault: event.target.checked } : current,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-medium">Apply to candidates entering this pipeline</span>
                  <span className="block text-sm text-muted-foreground">
                    Only one status per pipeline can do this; setting it here clears the previous one.
                  </span>
                </span>
              </label>

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
              <Button type="submit" disabled={saveStatus.isPending}>
                {saveStatus.isPending && <Loader2 className="size-4 animate-spin" />}
                Save status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
