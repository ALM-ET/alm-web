import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { AccessMatrix } from '@/components/AccessMatrix';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/app/auth';
import {
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
  type RoleSummary,
} from '@/hooks/queries';

interface Draft {
  id: string | null;
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY: Draft = { id: null, name: '', description: '', permissions: [] };

export function RolesTemplates() {
  const { can } = useAuth();
  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RoleSummary | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = can('staff:edit');
  const canDelete = can('staff:delete');

  const templates = roles?.filter((role) => role.isTemplate) ?? [];
  const own = roles?.filter((role) => !role.isTemplate) ?? [];

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
      if (draft.id) {
        await updateRole.mutateAsync({
          id: draft.id,
          name: draft.name,
          description: draft.description,
          permissions: draft.permissions,
        });
        toast.success(`Saved “${draft.name}”`);
      } else {
        await createRole.mutateAsync({
          name: draft.name,
          description: draft.description,
          permissions: draft.permissions,
        });
        toast.success(`Created “${draft.name}”`);
      }
      setDraft(null);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fields);
        setFormError(caught.message);
      } else {
        setFormError('Could not reach the server. Check your connection and try again.');
      }
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const role = pendingDelete;

    deleteRole.mutate(role.id, {
      onSuccess: () => {
        toast.success(`Deleted “${role.name}”`);
        setPendingDelete(null);
      },
      onError: (caught) =>
        toast.error(caught instanceof ApiError ? caught.message : 'Could not delete the role'),
    });
  };

  const saving = createRole.isPending || updateRole.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild className="-ms-3 mb-2">
            <Link to="/staff">
              <ArrowLeft />
              Back to staff accounts
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Roles &amp; templates</h1>
          <p className="mt-1 text-muted-foreground">
            Build a role once, then assign it to as many people as the job needs.
          </p>
        </div>

        {canEdit && (
          <Button onClick={() => open(EMPTY)}>
            <Plus />
            Create role
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">This agency’s roles</h2>

        {isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}

        {!isLoading && !own.length && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No roles yet. Create one, or start from a template below.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {own.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <Badge tone="outline">
                    {role.assignedCount} {role.assignedCount === 1 ? 'person' : 'people'}
                  </Badge>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </CardHeader>

              <CardContent className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {role.permissions.length} permissions
                </span>
                <div className="flex gap-1">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        open({
                          id: role.id,
                          name: role.name,
                          description: role.description ?? '',
                          permissions: role.permissions,
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
                      onClick={() => setPendingDelete(role)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {templates.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Starting points</h2>
            <p className="text-sm text-muted-foreground">
              Common jobs in a recruitment agency. Copying one makes it yours to edit — the
              template itself never changes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </CardHeader>

                <CardContent className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {template.permissions.length} permissions
                  </span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        open({
                          id: null,
                          name: template.name,
                          description: template.description ?? '',
                          permissions: template.permissions,
                        })
                      }
                    >
                      <Copy />
                      Use as a start
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent>
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>{draft?.id ? 'Edit role' : 'Create role'}</DialogTitle>
              <DialogDescription>
                Anyone already holding this role picks up the change the next time they load a page.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role name *</Label>
                <Input
                  id="role-name"
                  required
                  value={draft?.name ?? ''}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  placeholder="e.g. Visa &amp; Embassy Officer"
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={draft?.description ?? ''}
                  onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                  placeholder="What this role is responsible for."
                />
              </div>

              <AccessMatrix
                value={draft?.permissions ?? []}
                onChange={(permissions) => setDraft((d) => (d ? { ...d, permissions } : d))}
              />

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
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {draft?.id ? 'Save role' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.assignedCount
                ? `${pendingDelete.assignedCount} ${pendingDelete.assignedCount === 1 ? 'person is' : 'people are'} using this role. Reassign them before deleting it.`
                : 'Nobody is using this role, so nothing loses access.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRole.isPending || Boolean(pendingDelete?.assignedCount)}
              onClick={confirmDelete}
            >
              {deleteRole.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
