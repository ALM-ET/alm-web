import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { NAVIGATION, type NavItem } from '@/app/navigation';
import { useAuth } from '@/app/auth';
import { useT } from '@/app/i18n';
import { cn } from '@/lib/utils';

/**
 * A nav entry is visible only when the tenant has the module switched on AND
 * the user holds the permission. A group with no visible children disappears
 * entirely rather than rendering an empty accordion.
 */
function useVisibleNav(): NavItem[] {
  const { can, hasModule } = useAuth();

  const isVisible = (item: NavItem): boolean => {
    if (item.module && !hasModule(item.module)) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  };

  return NAVIGATION.flatMap((item) => {
    if (!isVisible(item)) return [];
    if (!item.children) return [item];
    const children = item.children.filter(isVisible);
    return children.length ? [{ ...item, children }] : [];
  });
}

function NavGroup({ item }: { item: NavItem }) {
  const t = useT();
  const location = useLocation();
  const containsActive = item.children!.some((child) => location.pathname === child.to);
  const [open, setOpen] = useState(containsActive);
  const Icon = item.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          containsActive && 'text-sidebar-accent-foreground',
        )}
      >
        <Icon className="size-5 shrink-0" />
        <span className="flex-1 text-start">{t(item.labelKey, item.label)}</span>
        <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <ul className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavRow key={child.to} item={child} nested />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavRow({ item, nested = false }: { item: NavItem; nested?: boolean }) {
  const t = useT();
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors',
            nested ? 'ps-8 pe-3' : 'px-3',
            isActive
              ? 'bg-sidebar-active text-sidebar-accent-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )
        }
      >
        <Icon className="size-5 shrink-0" />
        <span>{t(item.labelKey, item.label)}</span>
      </NavLink>
    </li>
  );
}

export function Sidebar() {
  const t = useT();
  const nav = useVisibleNav();
  const { bootstrap, logout } = useAuth();
  const branding = bootstrap?.branding;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        {branding?.logoLightUrl ? (
          <img src={branding.logoLightUrl} alt="" className="size-10 shrink-0 object-contain" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-lg font-bold text-sidebar-brand">
            {branding?.shortName?.[0] ?? 'A'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-sidebar-brand">{branding?.appName ?? 'A-LMIS'}</p>
          {branding?.tagline && (
            <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-sidebar-foreground/70">
              {branding.tagline}
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {nav.map((item) =>
            item.children ? <NavGroup key={item.to} item={item} /> : <NavRow key={item.to} item={item} />,
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="size-5 rtl-flip" />
          {t('nav.log_out', 'Log Out')}
        </button>
      </div>
    </aside>
  );
}
