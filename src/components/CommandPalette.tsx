import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { NAVIGATION, type NavItem } from '@/app/navigation';
import { useAuth } from '@/app/auth';
import { useTheme } from '@/app/theme';

/** Flatten the nav tree into leaf destinations the palette can jump to. */
function flatten(items: NavItem[], parent?: string): { label: string; group: string; to: string; icon: NavItem['icon'] }[] {
  return items.flatMap((item) =>
    item.children
      ? flatten(item.children, item.label)
      : [{ label: item.label, group: parent ?? 'Navigate', to: item.to, icon: item.icon }],
  );
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { can, hasModule, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [search, setSearch] = useState('');

  const destinations = useMemo(
    () =>
      flatten(NAVIGATION).filter((entry) => {
        const source = NAVIGATION.flatMap((i) => i.children ?? [i]).find((i) => i.to === entry.to);
        if (source?.module && !hasModule(source.module)) return false;
        if (source?.permission && !can(source.permission)) return false;
        return true;
      }),
    [can, hasModule],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof destinations>();
    for (const entry of destinations) {
      map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    }
    return [...map.entries()];
  }, [destinations]);

  // Clear the query on close so reopening never shows a stale search.
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or type a command…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Nothing matches “{search}”.</CommandEmpty>

        {grouped.map(([group, entries]) => (
          <CommandGroup key={group} heading={group}>
            {entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <CommandItem
                  key={entry.to}
                  value={`${group} ${entry.label}`}
                  onSelect={() => run(() => navigate(entry.to))}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {entry.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        <CommandGroup heading="Actions">
          <CommandItem value="toggle theme dark light" onSelect={() => run(toggle)}>
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Switch to {isDark ? 'light' : 'dark'} mode
          </CommandItem>
          <CommandItem value="log out sign out" onSelect={() => run(() => void logout())}>
            Log out
            <CommandShortcut>⇧⌘Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Registers ⌘K / Ctrl-K and returns the palette's open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
