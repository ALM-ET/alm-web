import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Inbox, Loader2, MailOpen, Phone, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuth } from '@/app/auth';
import { useT } from '@/app/i18n';

/**
 * Applications that arrived from the agency's public website.
 *
 * Everything here was typed by somebody with no account, so it is presented as
 * what it is — a claim, not a record. The only way out of this screen and into
 * the register is the ordinary registration form, with all of its validation
 * and its duplicate checks.
 */

interface Enquiry {
  id: string;
  kind: 'application' | 'contact';
  status: 'new' | 'read' | 'converted' | 'spam' | 'archived';
  fullName: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  postInterest: string | null;
  destinationCountry: string | null;
  experience: string | null;
  sourceUrl: string | null;
  candidateId: string | null;
  createdAt: string;
}

const TONE: Record<Enquiry['status'], 'primary' | 'success' | 'warning' | 'neutral' | 'danger'> = {
  new: 'primary',
  read: 'neutral',
  converted: 'success',
  spam: 'danger',
  archived: 'neutral',
};

function when(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function Enquiries() {
  const t = useT();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { can } = useAuth();

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status, search],
    queryFn: () =>
      api.get<{ items: Enquiry[]; total: number; counts: Record<string, number> }>(
        '/api/v1/enquiries',
        { query: { ...(status ? { status } : {}), ...(search ? { search } : {}) } },
      ),
  });

  const open = useQuery({
    queryKey: ['enquiry', openId],
    queryFn: () => api.get<Enquiry>(`/api/v1/enquiries/${openId}`),
    enabled: Boolean(openId),
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; note?: string }) =>
      api.patch<Enquiry>(`/api/v1/enquiries/${id}`, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['enquiries'] });
      void client.invalidateQueries({ queryKey: ['enquiry'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update that enquiry'),
  });

  const registerFrom = (enquiry: Enquiry) => {
    // Straight into the normal registration form, carrying what they typed.
    // The enquiry id rides along so the record can be linked back once the
    // candidate actually exists.
    navigate('/candidates/new', {
      state: {
        enquiryId: enquiry.id,
        prefill: {
          fullName: enquiry.fullName,
          phone: enquiry.phone ?? '',
          postAppliedFor: enquiry.postInterest ?? '',
          destinationCountry: enquiry.destinationCountry ?? '',
          skillsNotes: [enquiry.experience, enquiry.message].filter(Boolean).join('\n\n'),
        },
      },
    });
  };

  const detail = open.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('enquiries.title', 'Website enquiries')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t(
            'enquiries.subtitle',
            'People who filled in the form on your public site. Nothing here is a candidate record until you register them.',
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          className="w-64"
          placeholder={t('enquiries.search', 'Name, phone or email')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select className="w-48" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('enquiries.open', 'Everything but spam')}</option>
          <option value="new">{t('enquiries.new', 'New')}</option>
          <option value="read">{t('enquiries.read', 'Read')}</option>
          <option value="converted">{t('enquiries.converted', 'Registered')}</option>
          <option value="archived">{t('enquiries.archived', 'Archived')}</option>
          <option value="spam">{t('enquiries.spam', 'Filed as spam')}</option>
        </Select>
        {data && (
          <p className="text-sm text-muted-foreground">
            {t('enquiries.count', '{count} shown', { count: String(data.total) })}
            {data.counts.new ? ` · ${data.counts.new} new` : ''}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t('enquiries.empty', 'Nothing here yet. Applications from your website land in this list.')}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-2">
          {data?.items.map((enquiry) => (
            <button
              key={enquiry.id}
              type="button"
              onClick={() => setOpenId(enquiry.id)}
              className={`flex w-full flex-wrap items-center gap-3 rounded-lg border p-4 text-start transition-colors hover:bg-muted/50 ${
                openId === enquiry.id ? 'border-primary' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{enquiry.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[enquiry.postInterest, enquiry.destinationCountry, enquiry.phone]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Badge tone={TONE[enquiry.status]}>{enquiry.status}</Badge>
              <span className="text-xs text-muted-foreground">{when(enquiry.createdAt)}</span>
            </button>
          ))}
        </div>

        {detail && (
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{detail.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {when(detail.createdAt)} · {detail.kind}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="space-y-2 text-sm">
                {detail.phone && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>
                      <a className="underline" href={`tel:${detail.phone}`}>{detail.phone}</a>
                    </dd>
                  </div>
                )}
                {detail.email && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="truncate">{detail.email}</dd>
                  </div>
                )}
                {detail.postInterest && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Wants</dt>
                    <dd>{detail.postInterest}</dd>
                  </div>
                )}
                {detail.destinationCountry && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Destination</dt>
                    <dd>{detail.destinationCountry}</dd>
                  </div>
                )}
                {detail.experience && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Experience</dt>
                    <dd className="text-end">{detail.experience}</dd>
                  </div>
                )}
              </dl>

              {detail.message && (
                <p className="rounded-md bg-muted/50 p-3 text-sm">{detail.message}</p>
              )}

              {detail.status === 'converted' ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/candidates/${detail.candidateId}`}>
                    <UserPlus />
                    {t('enquiries.open_candidate', 'Open the candidate record')}
                  </a>
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {can('candidates:edit') && (
                    <Button onClick={() => registerFrom(detail)}>
                      <UserPlus />
                      {t('enquiries.register', 'Register this person')}
                    </Button>
                  )}
                  {can('enquiries:edit') && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => update.mutate({ id: detail.id, status: 'archived' })}
                      >
                        <MailOpen />
                        {t('enquiries.archive', 'Archive')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => update.mutate({ id: detail.id, status: 'spam' })}
                      >
                        <Ban />
                        {t('enquiries.mark_spam', 'Spam')}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {detail.phone && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="size-3.5" />
                  {t('enquiries.call_hint', 'Most people apply once and then wait for a call.')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
