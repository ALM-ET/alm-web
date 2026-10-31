import { ArrowRightLeft, Building2, FlaskConical } from 'lucide-react';
import { getTenant, isDemoTenant } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface AgencyBadgeProps {
  tenant?: string;
  appName?: string;
  interactive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function AgencyBadge({
  tenant,
  appName,
  interactive = false,
  onClick,
  size = 'md',
  className,
}: AgencyBadgeProps) {
  const currentTenant = tenant ?? getTenant() ?? 'demo';
  const isDemo = isDemoTenant(currentTenant);

  const Component = interactive ? 'button' : 'div';

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={
        interactive
          ? `Active agency workspace: ${isDemo ? 'Demo Sandbox' : currentTenant}. Click to switch.`
          : undefined
      }
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-all',
        size === 'sm' ? 'rounded-full px-2.5 py-1 text-xs' : 'rounded-full px-3 py-1.5 text-xs',
        isDemo
          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        interactive &&
          'cursor-pointer hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {isDemo ? (
        <>
          <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
          <FlaskConical className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Demo Sandbox</span>
          <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[0.65rem] font-mono uppercase text-amber-700 dark:text-amber-300">
            demo
          </span>
        </>
      ) : (
        <>
          <span className="flex size-2 rounded-full bg-emerald-500" />
          <Building2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">
            {appName ? appName : `Live PEA • ${currentTenant}`}
          </span>
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[0.65rem] font-mono uppercase text-emerald-700 dark:text-emerald-300">
            live
          </span>
        </>
      )}

      {interactive && (
        <span className="ms-1 flex items-center text-muted-foreground/80 hover:text-foreground">
          <ArrowRightLeft className="size-3" />
        </span>
      )}
    </Component>
  );
}
