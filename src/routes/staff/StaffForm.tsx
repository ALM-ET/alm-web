import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { AccessMatrix } from '@/components/AccessMatrix';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateStaff, useRoles, useStaff, useUpdateStaff } from '@/hooks/queries';

const DIRECT = 'direct';

/**
 * Create and edit a staff account.
 *
 * The role dropdown and the matrix are mutually exclusive by design: picking a
 * role means the role decides, and the matrix shows that role's permissions
 * read-only. "Custom / direct permissions" hands the matrix back. Letting both
 * apply at once produces accounts nobody can reason about six months later.
 */
export function StaffForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: roles } = useRoles();
  const { data: staff } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const existing = useMemo(() => staff?.find((account) => account.id === id), [staff, id]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string>(DIRECT);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setFullName(existing.fullName);
    setEmail(existing.email);
    setPhone(existing.phone ?? '');
    setRoleId(existing.roleId ?? DIRECT);
    setPermissions(existing.permissions);
  }, [existing]);

  const assignedRole = roles?.find((role) => role.id === roleId);
  const usesRole = roleId !== DIRECT;
  // What the account will actually be able to do, whichever route it took.
  const effective = usesRole ? (assignedRole?.permissions ?? []) : permissions;

  const pending = createStaff.isPending || updateStaff.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const payload = {
      fullName,
      email,
      phone,
      roleId: usesRole ? roleId : null,
      permissions: usesRole ? [] : permissions,
    };

    try {
      if (isEdit && id) {
        await updateStaff.mutateAsync({ id, ...payload });
        toast.success(`Saved ${fullName}`);
      } else {
        await createStaff.mutateAsync({ ...payload, password });
        toast.success(`${fullName} can now sign in`);
      }
      navigate('/staff');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fields);
        setFormError(caught.message);
      } else {
        setFormError('Could not reach the server. Check your connection and try again.');
      }
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" size="sm" asChild className="-ms-3 mb-2">
            <Link to="/staff">
              <ArrowLeft />
              Back to staff accounts
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? `Edit ${existing?.fullName ?? 'staff account'}` : 'Create staff account'}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Abebe Bikila"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName && <p className="text-sm text-destructive">{fieldErrors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value={DIRECT}>Custom / direct permissions</option>
              {roles
                ?.filter((role) => !role.isTemplate)
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address *</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              disabled={isEdit}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@agency.example"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {isEdit && (
              <p className="text-sm text-muted-foreground">
                The sign-in address cannot be changed here.
              </p>
            )}
            {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251 911 234 567"
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Access password *</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <p className="text-sm text-muted-foreground">
                At least 8 characters, with an uppercase letter, a lowercase letter and a number.
              </p>
              {fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {usesRole ? (
        <Card>
          <CardHeader>
            <CardTitle>Permissions from “{assignedRole?.name}”</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {assignedRole?.description ?? 'This role decides what the account can reach.'} Change
              the role itself under Roles &amp; templates, or switch to custom permissions above.
            </p>
            <AccessMatrix value={effective} onChange={() => undefined} disabled />
          </CardContent>
        </Card>
      ) : (
        <AccessMatrix value={permissions} onChange={setPermissions} />
      )}

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/staff')}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create staff account'}
        </Button>
      </div>
    </form>
  );
}
