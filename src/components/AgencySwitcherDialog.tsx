import { useState } from 'react';
import { ArrowRight, Building2, Check, FlaskConical, History, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRecentTenants, getTenant, isDemoTenant, setTenant } from '@/lib/api';

interface AgencySwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgencySwitcherDialog({ open, onOpenChange }: AgencySwitcherDialogProps) {
  const currentTenant = getTenant() ?? 'demo';
  const isDemo = isDemoTenant(currentTenant);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recentTenants = getRecentTenants();

  const handleSelect = (targetSlug: string) => {
    const cleaned = targetSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,63}$/.test(cleaned)) {
      setError('Agency slug must be 2-63 characters (lowercase letters, numbers, and hyphens only).');
      return;
    }
    setError(null);
    setTenant(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError('Please enter an agency workspace slug.');
      return;
    }
    handleSelect(slug);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Agency Workspace Switcher</DialogTitle>
              <DialogDescription className="text-xs">
                Select between the public demonstration sandbox and verified agency workspaces.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current active status summary */}
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active Workspace:</span>
            <span className="font-mono font-semibold uppercase">{currentTenant}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isDemo ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <FlaskConical className="size-3.5" />
                Demo Sandbox Mode (Sample Candidates & Visas)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />
                Verified Agency Workspace (Production PEA Database)
              </span>
            )}
          </div>
        </div>

        {/* Quick presets */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Environments
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Demo Sandbox Preset */}
            <button
              type="button"
              onClick={() => handleSelect('demo')}
              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-start transition-all ${
                currentTenant === 'demo'
                  ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-border/60 bg-card hover:bg-muted/60'
              }`}
            >
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">Demo Sandbox</span>
                  {currentTenant === 'demo' && (
                    <span className="rounded bg-amber-500/20 px-1 text-[0.6rem] font-bold text-amber-600 dark:text-amber-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[0.7rem] text-muted-foreground leading-tight mt-0.5">
                  Sandbox for testing passport OCR, biometric CVs, and embassy flows.
                </p>
              </div>
            </button>

            {/* If recent real agency exists, display it */}
            {recentTenants
              .filter((t) => t !== 'demo')
              .slice(0, 3)
              .map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => handleSelect(recent)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-start transition-all ${
                    currentTenant === recent
                      ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-border/60 bg-card hover:bg-muted/60'
                  }`}
                >
                  <History className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold capitalize">{recent}</span>
                      {currentTenant === recent && (
                        <span className="rounded bg-emerald-500/20 px-1 text-[0.6rem] font-bold text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[0.7rem] text-muted-foreground leading-tight mt-0.5 font-mono">
                      {recent}.app
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Custom Slug Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="agency-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connect to Another Agency Workspace
            </Label>
            <div className="relative">
              <Input
                id="agency-slug"
                placeholder="e.g. al-najm or ethio-talent"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setError(null);
                }}
                className="font-mono text-sm"
              />
            </div>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <Info className="size-3" />
                <span>Enter your agency slug provided during MoLS platform onboarding.</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              <span>Switch Workspace</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
