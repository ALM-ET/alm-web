import { useTheme } from '@/app/theme';
import type { Bootstrap } from '@alm/sdk';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  branding?: Bootstrap['branding'] | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  themeContext?: 'sidebar' | 'content';
}

export function BrandLogo({
  branding,
  className,
  size = 'md',
  showTagline = true,
  themeContext = 'content',
}: BrandLogoProps) {
  const { isDark } = useTheme();

  // If server supplies custom branding logo, use it; otherwise use the Ethiopian Foreign Employment Agency emblem
  const customLogoUrl = isDark
    ? branding?.logoDarkUrl ?? branding?.logoLightUrl
    : branding?.logoLightUrl ?? branding?.logoDarkUrl;

  const logoSrc = customLogoUrl || '/ethiopian-agency-logo.jpg';

  const iconSizes = {
    sm: 'size-9',
    md: 'size-11',
    lg: 'size-14',
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-lg font-bold',
  };

  const appName = branding?.appName || 'Ethiopian Foreign Employment Agency';
  const tagline = branding?.tagline || 'የውጭ ሀገር የሥራ ስምሪት ኤጀንሲ • MoLS Licensed PEA';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0">
        <img
          src={logoSrc}
          alt={appName}
          className={cn(
            iconSizes[size],
            'rounded-full object-cover shadow-md ring-2 transition-transform hover:scale-105',
            themeContext === 'sidebar'
              ? 'ring-sidebar-brand/40 shadow-black/40'
              : 'ring-amber-500/30 shadow-amber-500/10',
          )}
        />
        {/* Subtle status dot */}
        <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate tracking-tight leading-snug',
              textSizes[size],
              themeContext === 'sidebar' ? 'text-sidebar-foreground' : 'text-foreground',
            )}
          >
            {appName}
          </span>
        </div>
        {showTagline && (
          <p
            className={cn(
              'truncate text-[0.68rem] font-medium tracking-wide',
              themeContext === 'sidebar'
                ? 'text-sidebar-foreground/75'
                : 'text-muted-foreground',
            )}
          >
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
