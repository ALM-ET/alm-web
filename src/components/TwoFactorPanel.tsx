import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { AlertTriangle, Check, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { api } from '@/lib/api';
import { useT } from '@/app/i18n';

/**
 * Turning on a second factor.
 *
 * Three states rather than a single form, because enrolment is a sequence a
 * person can abandon halfway: scan, prove the app has it, then write down the
 * recovery codes. The codes are the part that matters — without them a lost
 * phone means an administrator has to turn somebody's second factor off, and if
 * that person *is* the only administrator, the agency is locked out of its own
 * records.
 */

interface MfaStatus {
  enabled: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
}

export function TwoFactorPanel() {
  const t = useT();
  const client = useQueryClient();
  const canvas = useRef<HTMLCanvasElement>(null);

  const [stage, setStage] = useState<'idle' | 'scanning' | 'codes'>('idle');
  const [setup, setSetup] = useState<{ uri: string; manualKey: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState('');

  const { data: status } = useQuery({
    queryKey: ['mfa'],
    queryFn: () => api.get<MfaStatus>('/api/v1/auth/mfa'),
  });

  // Drawn in the browser from the URI, so the secret never becomes an image on
  // the server and never passes through a proxy log as one.
  useEffect(() => {
    if (stage !== 'scanning' || !setup || !canvas.current) return;
    void QRCode.toCanvas(canvas.current, setup.uri, { width: 200, margin: 1 });
  }, [stage, setup]);

  const begin = useMutation({
    mutationFn: () => api.post<{ uri: string; manualKey: string }>('/api/v1/auth/mfa/setup', {}),
    onSuccess: (result) => {
      setSetup(result);
      setStage('scanning');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not start setup'),
  });

  const confirm = useMutation({
    mutationFn: () =>
      api.post<{ recoveryCodes: string[] }>('/api/v1/auth/mfa/enable', { code: code.trim() }),
    onSuccess: (result) => {
      setCodes(result.recoveryCodes);
      setStage('codes');
      setCode('');
      void client.invalidateQueries({ queryKey: ['mfa'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'That code was not accepted'),
  });

  const disable = useMutation({
    mutationFn: () =>
      api.post<void>('/api/v1/auth/mfa/disable', { password, code: code.trim() }),
    onSuccess: () => {
      setPassword('');
      setCode('');
      setStage('idle');
      void client.invalidateQueries({ queryKey: ['mfa'] });
      toast.success(t('mfa.turned_off', 'Two-factor sign-in is off.'));
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not turn it off'),
  });

  const download = () => {
    const text = [
      'A-LMIS recovery codes',
      '',
      'Each of these works once, and only if somebody also knows your password.',
      'Keep them somewhere separate from the device you sign in on.',
      '',
      ...codes,
    ].join('\n');

    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alm-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ----- already on ----- */

  if (status?.enabled && stage !== 'codes') {
    const low = status.recoveryCodesRemaining <= 2;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
            <ShieldCheck className="size-4 text-[var(--color-success)]" />
            {t('mfa.title', 'Two-factor sign-in')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="success">
              <Check className="size-3.5" />
              {t('mfa.on', 'On')}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {t('mfa.codes_left', '{count} recovery codes left', {
                count: String(status.recoveryCodesRemaining),
              })}
            </p>
          </div>

          {low && (
            <p className="flex items-start gap-2 rounded-md bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {t(
                'mfa.codes_low',
                'You are nearly out of recovery codes. Turn two-factor off and on again to get a fresh set, while you still have one to do it with.',
              )}
            </p>
          )}

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t(
                'mfa.disable_hint',
                'Turning it off needs your password and a current code — the two things somebody who found your screen unlocked would not have.',
              )}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mfa-password">{t('mfa.password', 'Your password')}</Label>
                <PasswordInput
                  id="mfa-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">{t('mfa.code', 'Code from your app')}</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            </div>

            <Button
              variant="outline"
              disabled={!password || code.trim().length < 6 || disable.isPending}
              onClick={() => disable.mutate()}
            >
              {disable.isPending && <Loader2 className="animate-spin" />}
              {t('mfa.turn_off', 'Turn off two-factor sign-in')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ----- the recovery codes, shown once ----- */

  if (stage === 'codes') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide">
            {t('mfa.save_codes', 'Save your recovery codes')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm">
            {t(
              'mfa.codes_explain',
              'These are the only way in if you lose your phone. Each works once. Keep them somewhere separate from the device you sign in on — printed, or in a password manager.',
            )}
          </p>

          <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-4 font-mono text-sm">
            {codes.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            {t('mfa.codes_once', 'They will not be shown again.')}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={download}>
              {t('mfa.download', 'Download them')}
            </Button>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              {t('mfa.saved_them', 'I have saved them')}
            </label>

            <Button
              disabled={!acknowledged}
              onClick={() => {
                setCodes([]);
                setStage('idle');
              }}
            >
              {t('mfa.done', 'Done')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ----- enrolling ----- */

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
          <Smartphone className="size-4 text-primary" />
          {t('mfa.title', 'Two-factor sign-in')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {stage === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground">
              {t(
                'mfa.explain',
                'Ask for a code from your phone as well as your password. It means a stolen password on its own is not enough to reach anybody’s records.',
              )}
            </p>
            <Button disabled={begin.isPending} onClick={() => begin.mutate()}>
              {begin.isPending && <Loader2 className="animate-spin" />}
              {t('mfa.turn_on', 'Turn on two-factor sign-in')}
            </Button>
          </>
        )}

        {stage === 'scanning' && setup && (
          <div className="space-y-4">
            <p className="text-sm">
              {t(
                'mfa.scan',
                'Scan this with an authenticator app — Google Authenticator, Authy, or whichever your phone already has.',
              )}
            </p>

            <div className="flex flex-wrap items-start gap-6">
              <canvas ref={canvas} className="rounded-md bg-white p-2" />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('mfa.cannot_scan', 'Cannot scan? Type this instead:')}
                </p>
                <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">
                  {setup.manualKey}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfa-confirm">
                {t('mfa.enter_code', 'Enter the code it shows')}
              </Label>
              <Input
                id="mfa-confirm"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-40 font-mono"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t(
                  'mfa.not_on_yet',
                  'Nothing changes until this works — so a bad scan cannot lock you out.',
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={code.trim().length < 6 || confirm.isPending}
                onClick={() => confirm.mutate()}
              >
                {confirm.isPending && <Loader2 className="animate-spin" />}
                {t('mfa.confirm', 'Confirm')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStage('idle');
                  setCode('');
                }}
              >
                {t('mfa.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
