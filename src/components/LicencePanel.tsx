import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useT } from '@/app/i18n';

/**
 * The licence, for an agency running this on its own server.
 *
 * Exists so a renewal does not require somebody with root on the server. An
 * agency's office manager is handed a key in an email; they should be able to
 * check what it grants, put it in place and carry on — not file a ticket with
 * whoever set the machine up two years ago.
 *
 * Absent on the hosted platform, where there is no licence to manage.
 */

interface LicenceClaims {
  organisation: string;
  plan: string;
  modules: string[];
  maxCandidates: number;
  maxUsers: number;
  issuedAt: string;
  expiresAt?: string;
  graceDays: number;
  note?: string;
}

interface LicenceView {
  state: 'valid' | 'grace' | 'expired' | 'missing' | 'invalid';
  writable: boolean;
  message: string;
  daysRemaining: number | null;
  claims: LicenceClaims | null;
}

const TONE: Record<LicenceView['state'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  valid: 'success',
  grace: 'warning',
  expired: 'danger',
  missing: 'danger',
  invalid: 'danger',
};

export function LicencePanel() {
  const t = useT();
  const client = useQueryClient();
  const [key, setKey] = useState('');
  const [checked, setChecked] = useState<LicenceView | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['licence'],
    queryFn: () => api.get<LicenceView>('/api/v1/licence'),
  });

  const check = useMutation({
    mutationFn: () => api.post<LicenceView>('/api/v1/licence/preview', { key: key.trim() }),
    onSuccess: setChecked,
    onError: (error) => {
      setChecked(null);
      toast.error(
        error instanceof ApiError
          ? error.message
          : t('licence.unreadable', 'That key could not be read.'),
      );
    },
  });

  const reload = useMutation({
    mutationFn: () => api.post<LicenceView>('/api/v1/licence/reload', {}),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ['licence'] });
      toast.success(result.message);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not reload the licence'),
  });

  // The hosted platform reports `valid` with no claims: there is no licence
  // file to manage, and a panel about one would only confuse.
  if (isLoading || !data || (data.state === 'valid' && !data.claims)) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
          <KeyRound className="size-4 text-primary" />
          {t('licence.title', 'Licence')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={TONE[data.state]}>
            {data.writable ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <AlertTriangle className="size-3.5" />
            )}
            {data.state}
          </Badge>
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>

        {!data.writable && (
          <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm">
            {t(
              'licence.read_only',
              'Records can still be read, searched and exported. Nothing can be changed until the licence is renewed — no work has been lost.',
            )}
          </p>
        )}

        {data.claims && (
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('licence.issued_to', 'Issued to')}</dt>
              <dd className="text-end font-medium">{data.claims.organisation}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('licence.plan', 'Plan')}</dt>
              <dd className="font-medium">{data.claims.plan}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('licence.expires', 'Expires')}</dt>
              <dd className="font-medium">
                {data.claims.expiresAt ?? t('licence.never', 'Never')}
                {data.daysRemaining !== null && data.daysRemaining > 0 && (
                  <span className="ms-2 text-muted-foreground">
                    {t('licence.days_left', '{count} days', { count: String(data.daysRemaining) })}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('licence.limits', 'Limits')}</dt>
              <dd className="text-end font-medium">
                {data.claims.maxCandidates || t('licence.unlimited', 'No limit')}
                {' · '}
                {data.claims.maxUsers || t('licence.unlimited', 'No limit')}
              </dd>
            </div>
            {data.claims.note && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">{t('licence.note', 'Note')}</dt>
                <dd className="mt-1">{data.claims.note}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="space-y-3 border-t pt-5">
          <div>
            <p className="font-medium">{t('licence.renew', 'Install a renewal')}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                'licence.renew_hint',
                'Paste the key you were sent to see what it grants before putting it in place.',
              )}
            </p>
          </div>

          <Textarea
            rows={3}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder="alm1..."
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setChecked(null);
            }}
            aria-label={t('licence.key', 'Licence key')}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={key.trim().length < 20 || check.isPending}
              onClick={() => check.mutate()}
            >
              {check.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {t('licence.check', 'Check this key')}
            </Button>
            <Button variant="ghost" disabled={reload.isPending} onClick={() => reload.mutate()}>
              {reload.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {t('licence.reload', 'Reload from the server')}
            </Button>
          </div>

          {checked && (
            <div className="rounded-md border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[checked.state]}>{checked.state}</Badge>
                <span className="text-muted-foreground">{checked.message}</span>
              </div>
              {checked.claims && (
                <p className="mt-3">
                  {t(
                    'licence.install_hint',
                    'To put this in place: save the key to the licence file on the server, then choose "Reload from the server". No restart is needed.',
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
