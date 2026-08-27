import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@alm/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useT } from '@/app/i18n';

/**
 * The files an agency has to send somebody else.
 *
 * Every report here exists because a party outside the agency asks for it on a
 * schedule — the labour ministry, an employer, the agency's own board. Which
 * ones appear depends on what the agency actually does: one that files with no
 * ministry has no LMIS report, and offering a report it can never produce is a
 * support call waiting to happen.
 */

interface ReportSummary {
  key: string;
  label: string;
  description: string;
  columns: string[];
}

export function Reports() {
  const t = useT();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [running, setRunning] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get<{ items: ReportSummary[] }>('/api/v1/reports'),
  });

  const download = async (report: ReportSummary) => {
    setRunning(report.key);
    try {
      const blob = await api.getBlob(`/api/v1/reports/${report.key}.csv`, {
        query: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t('reports.downloaded', '{label} downloaded', { label: report.label }));
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : t('reports.failed', 'Could not produce that report. Try again.'),
      );
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('reports.title', 'Reports')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t(
            'reports.subtitle',
            'Filings, departures and returns, as spreadsheets you can send on. Every export is recorded in the audit trail.',
          )}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide">
            {t('reports.period', 'Period')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('reports.period_hint', 'Leave both empty for everything on record.')}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">{t('reports.from', 'From')}</Label>
            <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">{t('reports.to', 'To')}</Label>
            <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              {t('reports.clear', 'Clear')}
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.items.map((report) => (
          <Card key={report.key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-4 text-primary" />
                {report.label}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {report.columns.slice(0, 6).join(' · ')}
                {report.columns.length > 6 &&
                  ` · ${t('reports.more_columns', '+{count} more', {
                    count: String(report.columns.length - 6),
                  })}`}
              </p>
              <Button
                variant="outline"
                disabled={running !== null}
                onClick={() => void download(report)}
              >
                {running === report.key ? <Loader2 className="animate-spin" /> : <Download />}
                {t('reports.export', 'Export CSV')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.items.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          {t('reports.none', 'No reports are available on this plan.')}
        </p>
      )}
    </div>
  );
}
