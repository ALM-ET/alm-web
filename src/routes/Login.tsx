import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Moon,
  Plane,
  Shield,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { ApiError } from '@alm/sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandLogo } from '@/components/BrandLogo';
import { AgencyBadge } from '@/components/AgencyBadge';
import { AgencySwitcherDialog } from '@/components/AgencySwitcherDialog';
import { getTenant, isDemoTenant } from '@/lib/api';
import { useAuth } from '@/app/auth';
import { useTheme } from '@/app/theme';
import { useI18n } from '@/app/i18n';

export function Login() {
  const { t, locale, locales, setLocale } = useI18n();
  const { isDark, toggle } = useTheme();
  const { status, login, bootstrap } = useAuth();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [totp, setTotp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const currentTenant = getTenant() ?? 'demo';
  const isDemo = isDemoTenant(currentTenant);

  if (status === 'authenticated') {
    return <Navigate to={params.get('next') ?? '/dashboard'} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await login(email, password, totp.trim() || undefined);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.code === 'mfa_required') {
          setNeedsCode(true);
          setError(null);
          setFieldErrors({});
          return;
        }

        if (caught.code === 'mfa_invalid') {
          setNeedsCode(true);
          setError(caught.message);
          setFieldErrors({});
          setTotp('');
          return;
        }

        setError(caught.message);
        setFieldErrors(caught.fields);
      } else {
        setError(
          t('errors.unreachable', 'Could not reach the server. Check your connection and try again.'),
        );
      }
    } finally {
      setPending(false);
    }
  };

  const agencyName = bootstrap?.branding?.appName || (isDemo ? 'Ethiopian Foreign Employment Agency (Demo)' : 'Ethiopian Foreign Employment Agency');

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground lg:grid lg:grid-cols-12">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 -start-40 -z-10 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 start-1/4 -z-10 size-80 rounded-full bg-accent/10 blur-3xl" />

      {/* Left Column: Sign-in Area */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:col-span-6 lg:p-12 xl:col-span-5">
        {/* Header Bar */}
        <header className="flex items-center justify-between gap-4">
          <BrandLogo branding={bootstrap?.branding} size="md" />

          <div className="flex items-center gap-2">
            {locales.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={t('shell.language', 'Language')}
                >
                  <Globe className="size-3.5" />
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
              className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>

        {/* Central Authentication Card */}
        <main className="mx-auto my-auto w-full max-w-md py-6">
          <div className="space-y-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground backdrop-blur">
                  <FileCheck className="size-3.5 text-primary" />
                  <span>FDRE MoLS Licensed PEA Portal</span>
                </div>
                <AgencyBadge
                  tenant={currentTenant}
                  appName={bootstrap?.branding?.appName}
                  interactive
                  onClick={() => setSwitcherOpen(true)}
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {needsCode
                  ? t('auth.two_factor_title', 'Two-Factor Verification')
                  : isDemo
                  ? 'Demo Agency Sign In'
                  : bootstrap?.branding?.appName ?? t('auth.welcome_back', 'Agency Portal Sign In')}
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {needsCode
                  ? t('auth.two_factor_subtitle', 'Enter your authenticator security code to complete sign in.')
                  : isDemo
                  ? 'Accessing the public demonstration sandbox with mock domestic worker files.'
                  : t('auth.sign_in_subtitle', 'Sign in to manage candidate dossiers, passport OCR, and embassy visa approvals.')}
                {isDemo && !needsCode && (
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen(true)}
                    className="ms-1.5 font-semibold text-primary underline underline-offset-2 hover:brightness-110"
                  >
                    Switch to Live Agency →
                  </button>
                )}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-snug">{error}</div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              {!needsCode ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('auth.email', 'Email address')}
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="username"
                        required
                        placeholder={isDemo ? 'demo@agency.et' : 'officer@agency.et'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 ps-9"
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p id="email-error" className="text-xs text-destructive">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('auth.password', 'Password')}
                      </Label>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                      <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 ps-9"
                        aria-invalid={Boolean(fieldErrors.password)}
                        showLabel={t('auth.show_password', 'Show password')}
                        hideLabel={t('auth.hide_password', 'Hide password')}
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <span>{t('auth.remember_me', 'Remember agency workstation')}</span>
                    </label>

                    <span className="text-xs text-muted-foreground">
                      {t('auth.trouble_signing_in', 'MoLS Help Desk: 818')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <ShieldCheck className="size-4" />
                    <span>{t('auth.authenticator_check', 'MoLS Authenticator Code')}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totp" className="text-xs font-medium text-foreground">
                      {t('auth.code', 'Code from your authenticator app')}
                    </Label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="totp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder="000000"
                        className="h-11 ps-9 font-mono tracking-widest text-base"
                        value={totp}
                        onChange={(event) => setTotp(event.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'auth.code_or_recovery',
                        'Or enter one of the recovery emergency codes saved during two-factor setup.',
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNeedsCode(false);
                      setTotp('');
                    }}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ← {t('auth.back_to_credentials', 'Use different credentials')}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="group h-11 w-full text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.99]"
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {needsCode
                        ? t('auth.verify_and_sign_in', 'Verify & Sign in')
                        : isDemo
                        ? 'Sign in to Demo Sandbox'
                        : t('auth.sign_in', 'Sign in to Agency Portal')}
                    </span>
                    <ArrowRight className="size-4 rtl-flip transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Compliance & Regulatory Highlights */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-5 text-[0.72rem] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-primary" />
                <span>MoLS E-LMIS Integrated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-success" />
                <span>Biometric Passports Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Plane className="size-3.5 text-amber-500" />
                <span>Bole Departure Cleared</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex flex-col gap-2 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {agencyName}. Proclamation No. 923/2016.
          </p>
          <div className="flex items-center gap-3">
            <span>MoLS Reg. PEA</span>
            <span>&bull;</span>
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </footer>
      </div>

      {/* Right Column: Ethiopian Overseas Operations Visual Showcase */}
      <div className="relative hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:col-span-7 bg-sidebar text-sidebar-foreground p-10 xl:p-14 overflow-hidden border-s border-border/20">
        {/* Background decorative atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-accent/80" />
        <div className="pointer-events-none absolute -top-32 -end-32 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -start-32 size-96 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top Showcase Status Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Addis Ababa Bole Hub (ADD) • Live Operations</span>
          </div>

          <span className="text-xs font-medium text-amber-400/90">
            MoLS Central E-LMIS: Synchronized
          </span>
        </div>

        {/* Center Graphic Showcase Card */}
        <div className="relative z-10 my-auto py-6">
          <div className="relative mx-auto max-w-xl group">
            {/* Ambient golden and sapphire glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/30 via-primary/40 to-amber-600/30 opacity-60 blur-xl transition duration-700 group-hover:opacity-90" />

            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-sidebar-accent/60 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
              <img
                src="/ethiopian-employment-hero.jpg"
                alt="Ethiopian Foreign Employment Agency Operations Dashboard"
                className="h-[360px] w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* Floating Overlay Badge on the Hero Image */}
              <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between rounded-xl border border-white/20 bg-sidebar/85 p-3.5 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold shadow-sm">
                    <Plane className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Overseas Deployment Pipeline</p>
                    <p className="text-[0.7rem] text-white/70">
                      Riyadh (RUH) • Dubai (DXB) • Doha (DOH) • Kuwait (KWI) • Jeddah (JED)
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  Embassy Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Pitch & Agency Operational Metrics */}
        <div className="relative z-10 space-y-6 pt-2">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white xl:text-2xl">
              Ethiopian Foreign Employment Agency Management System
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-sidebar-foreground/80">
              Complete digital overseas labour operations: candidate biometric passport OCR, COC skill verification, pre-departure orientation (PDOS), and GCC embassy visa processing.
            </p>
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <div className="space-y-1">
              <p className="text-xl font-extrabold text-amber-400 xl:text-2xl">45,000+</p>
              <p className="text-[0.7rem] uppercase tracking-wider text-sidebar-foreground/60">Deployed Workers</p>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-extrabold text-white xl:text-2xl">100%</p>
              <p className="text-[0.7rem] uppercase tracking-wider text-sidebar-foreground/60">MoLS & COC Verified</p>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-extrabold text-white xl:text-2xl">6 GCC</p>
              <p className="text-[0.7rem] uppercase tracking-wider text-sidebar-foreground/60">Partner Embassies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Agency Switcher Dialog */}
      <AgencySwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
}
