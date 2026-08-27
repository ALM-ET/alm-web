import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  FileText,
  Loader2,
  Plane,
  RefreshCw,
  ShieldAlert,
  Stamp,
  Ticket,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/app/auth';
import { useDashboard } from '@/hooks/queries';

/** Distinct hues per stage, so the funnel reads as a sequence at a glance. */
const STAGE_ACCENT: Record<string, string> = {
  registration: 'var(--color-accent)',
  medical: 'var(--color-success)',
  lmis: 'var(--color-primary)',
  embassy: '#8b5cf6',
  visa: 'var(--color-warning)',
  flight: '#ec4899',
  deployed: 'var(--color-success)',
};

const STAGE_ICON: Record<string, typeof Users> = {
  registration: UserPlus,
  medical: Activity,
  lmis: FileText,
  embassy: Stamp,
  visa: ShieldAlert,
  flight: Ticket,
  deployed: Plane,
};

const STAGE_LINK: Record<string, string> = {
  registration: '/candidates',
  medical: '/candidates',
  lmis: '/processing/lmis',
  embassy: '/processing/embassy',
  visa: '/processing/embassy',
  flight: '/deployment/tickets',
  deployed: '/deployment/departed',
};

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * The monthly trend, drawn as an inline SVG.
 *
 * A charting library would be a 100 kB dependency for one twelve-point line;
 * the axis labels and the emphasised final point are the parts that carry
 * meaning, and both are cheaper to control by hand.
 */
function TrendChart({ data }: { data: { label: string; count: number }[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const max = Math.max(4, ...data.map((point) => point.count));

  const x = (index: number) =>
    padding.left + (index * (width - padding.left - padding.right)) / Math.max(1, data.length - 1);
  const y = (value: number) =>
    padding.top + (1 - value / max) * (height - padding.top - padding.bottom);

  const line = data.map((point, index) => `${x(index)},${y(point.count)}`).join(' ');
  const area = `${padding.left},${y(0)} ${line} ${x(data.length - 1)},${y(0)}`;
  const last = data[data.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full min-w-[36rem]"
        role="img"
        aria-label={`Registrations per month. Latest: ${last?.count ?? 0} in ${last?.label ?? ''}.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(max * fraction)}
              y2={y(max * fraction)}
              stroke="var(--color-border)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y(max * fraction) + 4}
              textAnchor="end"
              className="fill-[var(--color-muted-foreground)] text-[10px]"
            >
              {Math.round(max * fraction)}
            </text>
          </g>
        ))}

        <polygon points={area} fill="var(--color-primary)" opacity="0.12" />
        <polyline points={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />

        {data.map((point, index) => (
          <circle
            key={point.label + index}
            cx={x(index)}
            cy={y(point.count)}
            r={index === data.length - 1 ? 5 : 3}
            fill="var(--color-primary)"
          />
        ))}

        {data.map((point, index) => (
          <text
            key={`label-${index}`}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            className="fill-[var(--color-muted-foreground)] text-[10px]"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function Dashboard() {
  const { bootstrap, can } = useAuth();
  const [range, setRange] = useState('this_month');
  const { data, isLoading } = useDashboard(range);

  const user = bootstrap?.user;
  const kpis = data?.kpis;

  const cards = [
    {
      label: 'Total candidates',
      value: kpis?.total ?? 0,
      badge:
        kpis?.changePercent === null || kpis?.changePercent === undefined
          ? null
          : `${kpis.changePercent >= 0 ? '+' : ''}${kpis.changePercent}%`,
      tone: (kpis?.changePercent ?? 0) >= 0 ? ('success' as const) : ('danger' as const),
      icon: Users,
    },
    { label: 'In processing', value: kpis?.processing ?? 0, badge: 'Active', tone: 'primary' as const, icon: RefreshCw },
    { label: 'Departed (30 days)', value: kpis?.recentlyDeparted ?? 0, badge: 'Departed', tone: 'neutral' as const, icon: Plane },
    { label: 'Awaiting selection', value: kpis?.pendingApprovals ?? 0, badge: 'Pending', tone: 'warning' as const, icon: ShieldAlert },
  ];

  const quickActions = [
    { label: 'Register candidate', to: '/candidates/new', icon: UserPlus, permission: 'candidates:edit' as const },
    { label: 'LMIS pipeline', to: '/processing/lmis', icon: FileText, permission: 'lmis:view' as const },
    { label: 'Embassy', to: '/processing/embassy', icon: Stamp, permission: 'embassy:view' as const },
    { label: 'Local agents', to: '/agents', icon: UserRound, permission: 'agents:view' as const },
    { label: 'Overseas offices', to: '/offices', icon: Building2, permission: 'offices:view' as const },
  ].filter((action) => can(action.permission));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.fullName}</h1>
          <p className="mt-1 text-muted-foreground">
            Here is your recruitment pipeline overview for today.
          </p>
        </div>

        <Select
          className="w-44"
          value={range}
          onChange={(event) => setRange(event.target.value)}
          aria-label="Reporting period"
        >
          <option value="this_month">This month</option>
          <option value="last_3_months">Last 3 months</option>
          <option value="this_year">This year</option>
          <option value="all_time">All time</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="size-5 text-muted-foreground" />
                  </span>
                  {card.badge && <Badge tone={card.tone}>{card.badge}</Badge>}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {isLoading ? <Loader2 className="size-6 animate-spin" /> : card.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Candidate processing pipeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Where everyone is right now. Each tile opens the queue that works it.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {data?.funnel.map((tile) => {
              const Icon = STAGE_ICON[tile.stage] ?? Users;
              return (
                <Link
                  key={tile.stage}
                  to={STAGE_LINK[tile.stage] ?? '/candidates'}
                  className="group flex flex-col gap-2 bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <span
                    className="h-1 w-10 rounded-full"
                    style={{ background: STAGE_ACCENT[tile.stage] ?? 'var(--color-primary)' }}
                  />
                  <Icon className="size-5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {tile.label}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{tile.count}</span>
                  <span className="text-xs text-muted-foreground">{tile.description}</span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Monthly candidate trend</CardTitle>
            <p className="text-sm text-muted-foreground">Registrations over the last twelve months.</p>
          </CardHeader>
          <CardContent>
            {data ? (
              <TrendChart data={data.trend} />
            ) : (
              <div className="flex h-52 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {quickActions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button key={action.to} variant="outline" className="h-auto justify-start py-3" asChild>
                      <Link to={action.to}>
                        <Icon />
                        <span className="text-start text-xs leading-tight">{action.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
              {can('audit:view') && (
                <Button variant="link" size="sm" asChild className="h-auto p-0">
                  <Link to="/audit-logs">View all</Link>
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {!data?.activity.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing has happened yet today.
                </p>
              )}

              <ul className="space-y-3">
                {data?.activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorName} · {relative(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
