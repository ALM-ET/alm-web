import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, KeyRound, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { api } from '@/lib/api';
import { useAuth } from '@/app/auth';
import { useT } from '@/app/i18n';

/**
 * Your own account.
 *
 * Two things only: who you are, and how you sign in. Everything about what you
 * are allowed to do belongs to whoever administers the agency — a screen where
 * somebody can edit their own access is not a profile screen, it is a hole.
 */

interface Me {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  roleLabel: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function Profile() {
  const t = useT();
  const client = useQueryClient();
  const { bootstrap, refresh } = useAuth();
  const photoInput = useRef<HTMLInputElement>(null);

  const user = bootstrap?.user as Me | undefined;

  const [details, setDetails] = useState({ fullName: '', email: '', phone: '' });
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [detailError, setDetailError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDetails({ fullName: user.fullName, email: user.email, phone: user.phone ?? '' });
  }, [user]);

  const saveDetails = useMutation({
    mutationFn: (body: typeof details) => api.patch<Me>('/api/v1/auth/me', body),
    onSuccess: async (updated, sent) => {
      setDetailErrors({});
      setDetailError(null);
      await refresh();
      void client.invalidateQueries();

      toast.success(
        sent.email !== user?.email
          ? t(
              'profile.email_changed',
              'Saved. You will sign in with {email} from now on, and anywhere else you were signed in has been signed out.',
              { email: updated.email },
            )
          : t('profile.saved', 'Your details have been saved.'),
      );
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setDetailErrors(error.fields);
        setDetailError(error.message);
      } else {
        setDetailError(t('profile.unreachable', 'Could not reach the server. Try again.'));
      }
    },
  });

  const changePassword = useMutation({
    mutationFn: (body: typeof passwords) => api.post<void>('/api/v1/auth/change-password', body),
    onSuccess: () => {
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      setPasswordError(null);
      toast.success(
        t(
          'profile.password_changed',
          'Password changed. Anywhere else you were signed in has been signed out.',
        ),
      );
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPasswordErrors(error.fields);
        setPasswordError(error.message);
      } else {
        setPasswordError(t('profile.unreachable', 'Could not reach the server. Try again.'));
      }
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.postForm<Me>('/api/v1/auth/me/avatar', form);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(t('profile.photo_changed', 'Photo updated.'));
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : t('profile.photo_failed', 'That photo could not be uploaded.'),
      ),
    onSettled: () => {
      if (photoInput.current) photoInput.current.value = '';
    },
  });

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onSaveDetails = (event: FormEvent) => {
    event.preventDefault();
    saveDetails.mutate(details);
  };

  const onChangePassword = (event: FormEvent) => {
    event.preventDefault();

    // Checked here as well as on the server, because a mistyped confirmation is
    // the common case and a round trip to be told so is a poor way to find out.
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrors({ confirmPassword: t('profile.no_match', 'These do not match.') });
      return;
    }

    changePassword.mutate(passwords);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title', 'My profile')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('profile.subtitle', 'Your details and how you sign in.')}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 pt-6">
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="size-20 rounded-full object-cover"
                width={80}
                height={80}
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {initials(user.fullName)}
              </span>
            )}
            {uploadPhoto.isPending && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                <Loader2 className="size-6 animate-spin" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold">{user.fullName}</p>
            <p className="truncate text-muted-foreground">{user.email}</p>
            {user.roleLabel && (
              <Badge tone="primary" className="mt-2">
                <ShieldCheck className="size-3.5" />
                {user.roleLabel}
              </Badge>
            )}
          </div>

          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadPhoto.mutate(file);
            }}
          />
          <Button
            variant="outline"
            disabled={uploadPhoto.isPending}
            onClick={() => photoInput.current?.click()}
          >
            <Camera />
            {t('profile.change_photo', 'Change photo')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
              <UserRound className="size-4 text-primary" />
              {t('profile.personal', 'Personal account information')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSaveDetails} className="space-y-4" noValidate>
              {detailError && (
                <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {detailError}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">{t('profile.full_name', 'Full name')} *</Label>
                <Input
                  id="fullName"
                  required
                  value={details.fullName}
                  onChange={(event) => setDetails({ ...details, fullName: event.target.value })}
                  aria-invalid={Boolean(detailErrors.fullName)}
                />
                {detailErrors.fullName && (
                  <p className="text-sm text-destructive">{detailErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email', 'Email address')} *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={details.email}
                  onChange={(event) => setDetails({ ...details, email: event.target.value })}
                  aria-invalid={Boolean(detailErrors.email)}
                />
                {detailErrors.email ? (
                  <p className="text-sm text-destructive">{detailErrors.email}</p>
                ) : (
                  details.email !== user.email && (
                    <p className="text-sm text-[var(--color-warning)]">
                      {t(
                        'profile.email_warning',
                        'This is what you sign in with. Changing it signs you out everywhere else.',
                      )}
                    </p>
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('profile.phone', 'Phone number')}</Label>
                <Input
                  id="phone"
                  value={details.phone}
                  onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                  placeholder="+251 911 234 567"
                />
              </div>

              <Button type="submit" disabled={saveDetails.isPending}>
                {saveDetails.isPending && <Loader2 className="animate-spin" />}
                {t('profile.save_details', 'Save personal details')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
              <KeyRound className="size-4 text-primary" />
              {t('profile.security', 'Security & password')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={onChangePassword} className="space-y-4" noValidate>
              {passwordError && (
                <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {passwordError}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {t('profile.current_password', 'Current password')} *
                </Label>
                <PasswordInput
                  id="currentPassword"
                  required
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, currentPassword: event.target.value })
                  }
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.new_password', 'New password')} *</Label>
                <PasswordInput
                  id="newPassword"
                  required
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, newPassword: event.target.value })
                  }
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                />
                <p className="text-sm text-muted-foreground">
                  {t(
                    'profile.password_rule',
                    'At least 8 characters, with an uppercase letter, a lowercase letter and a number.',
                  )}
                </p>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('profile.confirm_password', 'Confirm new password')} *
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  required
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, confirmPassword: event.target.value })
                  }
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {t(
                  'profile.password_note',
                  'Changing your password signs you out everywhere except here — which is what you want if you think somebody else has your account open.',
                )}
              </p>

              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="animate-spin" />}
                {t('profile.change_password', 'Change password')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
