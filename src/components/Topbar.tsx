import { Moon, Search, Sun } from 'lucide-react';
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
import { useAuth } from '@/app/auth';
import { useTheme } from '@/app/theme';
import { initials } from '@/lib/utils';

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { bootstrap, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const user = bootstrap?.user;

  return (
    <header className="flex items-center gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring"
      >
        <Search className="size-4" />
        <span className="flex-1 text-start">Search or type a command…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium">⌘K</kbd>
      </button>

      <div className="ms-auto flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout()} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
