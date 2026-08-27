import { useState, type FormEvent } from 'react';
import { Building2, KeyRound, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAuth } from '@/app/auth';
import { useDeleteOffice, useOffices, useSaveOffice, type PartnerOffice } from '@/hooks/queries';

interface Draft {
  id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  hasLogin: boolean;
}

const BLANK: Draft = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  password: '',
  hasLogin: false,
};

export function Offices() {
  const { can } = useAuth();
  const { data: offices, isLoading } = useOffices();
  const saveOffice = useSaveOffice();
  const deleteOffice = useDeleteOffice();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PartnerOffice | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = can('offices:edit');
  const canDelete = can('offices:delete');

  const open = (next: Draft) => {
    setFieldErrors({});
    setFormError(null);
    setDraft(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setFieldErrors({});
    setFormError(null);

    try {
      await saveOffice.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name,
        contactPerson: draft.contactPerson,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        ...(draft.password ? { password: draft.password } : {}),
      });
      toast.success(draft.id ? `Saved ${draft.name}` : `${draft.name} added`);
      setDraft(null);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fields);
        setFormError(caught.message);
      } else {
        setFormError('Could not reach the server.');
      }
    }
  };

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overseas offices</h1>
          <p className="mt-1 text-muted-foreground">
            Partner agencies abroad. Give one a password and it can sign in to see its own
            candidates.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => open(BLANK)}>
            <Plus />
            Add partner office
          </Button>
        )}
      </div>

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Office</TH>
              <TH>Contact person</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Candidates</TH>
              <TH>Access</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={7}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !offices?.length && (
              <EmptyRow colSpan={7}>
                <span className="flex flex-col items-center gap-3">
                  <Building2 className="size-8 text-muted-foreground/60" />
                  No partner offices yet.
                </span>
              </EmptyRow>
            )}

            {offices?.map((office) => (
              <TR key={office.id}>
                <TD className="font-medium">{office.name}</TD>
                <TD className="text-muted-foreground">{office.contactPerson}</TD>
                <TD className="text-muted-foreground">{office.email}</TD>
                <TD className="text-muted-foreground">{office.phone}</TD>
                <TD className="tabular-nums">{office.candidateCount}</TD>
                <TD>
                  {office.hasLogin ? (
                    <Badge tone="success">
                      <KeyRound className="size-3" />
                      Can sign in
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Contact only</Badge>
                  )}
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          open({
                            id: office.id,
                            name: office.name,
                            contactPerson: office.contactPerson,
                            phone: office.phone,
                            email: office.email,
                            address: office.address ?? '',
                            password: '',
                            hasLogin: office.hasLogin,
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
                        onClick={() => setPendingDelete(office)}
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
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Edit partner office' : 'Add partner office'}</DialogTitle>
              <DialogDescription>
                The office appears on every candidate it places, and on the directory filters.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="office-name">Office name *</Label>
                <Input id="office-name" required value={draft?.name ?? ''} onChange={set('name')} placeholder="e.g. Al-Riyadh Manpower Agency" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="office-contact">Contact person *</Label>
                <Input id="office-contact" required value={draft?.contactPerson ?? ''} onChange={set('contactPerson')} placeholder="e.g. Mohammed Al-Harbi" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="office-phone">Phone number *</Label>
                  <Input id="office-phone" required value={draft?.phone ?? ''} onChange={set('phone')} placeholder="+966 50 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-email">Email address *</Label>
                  <Input
                    id="office-email"
                    type="email"
                    required
                    value={draft?.email ?? ''}
                    onChange={set('email')}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="office-address">Address</Label>
                <Textarea id="office-address" value={draft?.address ?? ''} onChange={set('address')} placeholder="e.g. King Fahd Road, Riyadh 12345, Saudi Arabia" />
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="office-password">
                  {draft?.hasLogin ? 'Reset sign-in password' : 'Sign-in password'}
                </Label>
                <Input
                  id="office-password"
                  type="text"
                  value={draft?.password ?? ''}
                  onChange={set('password')}
                  placeholder="Leave blank for no sign-in access"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <p className="text-sm text-muted-foreground">
                  {draft?.hasLogin
                    ? 'Setting a new password signs the office out everywhere.'
                    : 'At least 8 characters. Leave blank to record the office as a contact only.'}
                </p>
                {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
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
              <Button type="submit" disabled={saveOffice.isPending}>
                {saveOffice.isPending && <Loader2 className="size-4 animate-spin" />}
                Save office
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.candidateCount
                ? `The ${pendingDelete.candidateCount} candidates they placed keep the reference — only the office's access is removed.`
                : 'The office is removed and can no longer sign in.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOffice.isPending}
              onClick={() =>
                pendingDelete &&
                deleteOffice.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success(`Removed ${pendingDelete.name}`);
                    setPendingDelete(null);
                  },
                  onError: (caught) =>
                    toast.error(caught instanceof ApiError ? caught.message : 'Could not remove it'),
                })
              }
            >
              {deleteOffice.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove office
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
