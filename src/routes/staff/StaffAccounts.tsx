import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
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
import { EmptyRow, Table, TableWrapper, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAuth } from '@/app/auth';
import { useDeleteStaff, useStaff, useUpdateStaff, type StaffAccount } from '@/hooks/queries';

function relative(iso: string | null): string {
  if (!iso) return 'Never';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function StaffAccounts() {
  const { can } = useAuth();
  const { data: staff, isLoading, error } = useStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const [pendingDelete, setPendingDelete] = useState<StaffAccount | null>(null);

  const canEdit = can('staff:edit');
  const canDelete = can('staff:delete');

  const toggleStatus = (account: StaffAccount) => {
    const next = account.status === 'active' ? 'suspended' : 'active';
    updateStaff.mutate(
      { id: account.id, status: next },
      {
        onSuccess: () =>
          toast.success(
            next === 'suspended'
              ? `${account.fullName} can no longer sign in`
              : `${account.fullName} can sign in again`,
          ),
        onError: (caught) =>
          toast.error(caught instanceof ApiError ? caught.message : 'Could not update the account'),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const account = pendingDelete;

    deleteStaff.mutate(account.id, {
      onSuccess: () => {
        toast.success(`Deleted ${account.fullName}`);
        setPendingDelete(null);
      },
      onError: (caught) =>
        toast.error(caught instanceof ApiError ? caught.message : 'Could not delete the account'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff accounts</h1>
          <p className="mt-1 text-muted-foreground">
            Who works in this agency, and what each of them can reach.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/staff/roles">
              <ShieldCheck />
              Roles &amp; templates
            </Link>
          </Button>
          {canEdit && (
            <Button asChild>
              <Link to="/staff/new">
                <UserPlus />
                Create staff account
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof ApiError ? error.message : 'Could not load staff accounts.'}
        </p>
      )}

      <TableWrapper>
        <Table>
          <THead>
            <TR>
              <TH>Full name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Assigned role</TH>
              <TH>Last sign-in</TH>
              <TH>Status</TH>
              <TH className="text-end">Actions</TH>
            </TR>
          </THead>

          <TBody>
            {isLoading && (
              <EmptyRow colSpan={7}>
                <Loader2 className="mx-auto size-5 animate-spin" />
              </EmptyRow>
            )}

            {!isLoading && !staff?.length && (
              <EmptyRow colSpan={7}>No staff accounts yet.</EmptyRow>
            )}

            {staff?.map((account) => (
              <TR key={account.id}>
                <TD className="font-medium">
                  {account.fullName}
                  {account.isOwner && (
                    <Badge tone="primary" className="ms-2">
                      Administrator
                    </Badge>
                  )}
                </TD>
                <TD className="text-muted-foreground">{account.email}</TD>
                <TD className="text-muted-foreground">{account.phone ?? '—'}</TD>
                <TD>
                  <Badge tone={account.roleId ? 'outline' : 'neutral'}>{account.roleLabel}</Badge>
                </TD>
                <TD className="text-muted-foreground">{relative(account.lastLoginAt)}</TD>
                <TD>
                  <Badge tone={account.status === 'active' ? 'success' : 'danger'}>
                    {account.status === 'active' ? 'Active' : 'Suspended'}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/staff/${account.id}`}>
                          <Pencil />
                          Edit
                        </Link>
                      </Button>
                    )}
                    {canEdit && !account.isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateStaff.isPending}
                        onClick={() => toggleStatus(account)}
                      >
                        {account.status === 'active' ? 'Suspend' : 'Restore'}
                      </Button>
                    )}
                    {canDelete && !account.isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setPendingDelete(account)}
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

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.fullName}?</DialogTitle>
            <DialogDescription>
              They lose access immediately and any open session is ended. Their name stays on the
              audit trail, so past actions remain traceable.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteStaff.isPending} onClick={confirmDelete}>
              {deleteStaff.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
