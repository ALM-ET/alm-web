import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';
import { AgencySwitcherDialog } from '@/components/AgencySwitcherDialog';
import { isDemoTenant } from '@/lib/api';

export function AdminLayout() {
  const palette = useCommandPalette();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const isDemo = isDemoTenant();

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {isDemo && (
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Demo Sandbox Active:</strong> You are browsing mock domestic worker dossiers and test embassy submissions.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="font-semibold underline underline-offset-2 hover:brightness-125"
            >
              Switch to Live Agency →
            </button>
          </div>
        )}
        <Topbar
          onOpenPalette={() => palette.setOpen(true)}
          onOpenSwitcher={() => setSwitcherOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <AgencySwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
}
