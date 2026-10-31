import { Globe, Moon, Search, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgencyBadge } from '@/components/AgencyBadge';
import { useAuth } from '@/app/auth';
import { useTheme } from '@/app/theme';
import { useI18n } from '@/app/i18n';
import { initials } from '@/lib/utils';

export function Topbar({
  onOpenPalette,
  onOpenSwitcher,
}: {
  onOpenPalette: () => void;
  onOpenSwitcher?: () => void;
}) {
  const { bootstrap, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { t, locale, locales, setLocale } = useI18n();
  const user = bootstrap?.user;

  return (
    <header className="flex items-center gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring"
      >
        <Search className="size-4" />
        <span className="flex-1 text-start">
          {t('shell.search_placeholder', 'Search or type a command…')}
        </span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium">⌘K</kbd>
      </button>

      <div className="ms-auto flex items-center gap-3">
        <AgencyBadge
          appName={bootstrap?.branding?.appName}
          interactive={Boolean(onOpenSwitcher)}
          onClick={onOpenSwitcher}
          size="sm"
        />

        {/* Only shown when the agency actually offers a choice. */}
        {locales.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('shell.language', 'Language')}
            >
              <Globe className="size-4" />
              <span className="uppercase">{locale}</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('shell.language', 'Language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {locales.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  onSelect={() => setLocale(option.code)}
                  className={option.code === locale ? 'font-semibold text-primary' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-label={
            isDark
              ? t('shell.switch_light', 'Switch to light mode')
              : t('shell.switch_dark', 'Switch to dark mode')
          }
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pe-4 ps-1.5 transition-colors hover:border-ring">
            <Avatar>
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback>{initials(user?.fullName ?? '?')}</AvatarFallback>
            </Avatar>
            <span className="hidden text-start sm:block">
              <span className="block text-sm font-semibold leading-tight">{user?.fullName}</span>
              <span className="block text-xs font-medium text-primary">{user?.roleLabel}</span>
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">{t('nav.profile', 'Profile')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout()} className="text-destructive">
              {t('shell.log_out', 'Log out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
