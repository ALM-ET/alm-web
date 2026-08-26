import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import type { Permission } from '@alm/sdk';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Login } from '@/routes/Login';
import { Dashboard } from '@/routes/Dashboard';
import { Placeholder } from '@/routes/Placeholder';
import { StaffAccounts } from '@/routes/staff/StaffAccounts';
import { StaffForm } from '@/routes/staff/StaffForm';
import { RolesTemplates } from '@/routes/staff/RolesTemplates';
import { AuditLogs } from '@/routes/AuditLogs';
import { useAuth } from './auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'anonymous') {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

/**
 * Route-level permission gate.
 *
 * Hiding a nav entry keeps the screen out of the way; it does not stop someone
 * typing the URL. The API refuses them either way, but rendering the screen
 * around an empty or stale response is worse than saying so plainly.
 */
function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { can } = useAuth();

  if (!can(permission)) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-20 text-center">
        <ShieldOff className="mx-auto size-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">You do not have access to this</h1>
        <p className="text-muted-foreground">
          Ask an agency administrator to grant it, or head back to your dashboard.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/** Every screen from the recorded system, routed now and filled in per milestone. */
const PLACEHOLDERS: { path: string; title: string; milestone: string }[] = [
  { path: 'candidates', title: 'Candidates Directory', milestone: 'M2' },
  { path: 'candidates/cv', title: 'Create CV', milestone: 'M6' },
  { path: 'candidates/new', title: 'Register Candidate', milestone: 'M2' },
  { path: 'candidates/archived', title: 'Archived Candidates', milestone: 'M2' },
  { path: 'processing/lmis', title: 'LMIS Pipeline', milestone: 'M3' },
  { path: 'processing/embassy', title: 'Embassy Pipeline', milestone: 'M3' },
  { path: 'deployment/tickets', title: 'Flight Tickets', milestone: 'M3' },
  { path: 'deployment/issued', title: 'Issued Tickets', milestone: 'M3' },
  { path: 'deployment/departed', title: 'Departed List', milestone: 'M3' },
  { path: 'deployment/returned', title: 'Returned List', milestone: 'M3' },
  { path: 'offices', title: 'Overseas Offices', milestone: 'M2' },
  { path: 'agents', title: 'Local Agents', milestone: 'M2' },
  { path: 'settings', title: 'System Settings', milestone: 'M3' },
  { path: 'profile', title: 'Profile', milestone: 'M1' },
];

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="staff"
          element={
            <RequirePermission permission="staff:view">
              <StaffAccounts />
            </RequirePermission>
          }
        />
        <Route
          path="staff/new"
          element={
            <RequirePermission permission="staff:edit">
              <StaffForm />
            </RequirePermission>
          }
        />
        <Route
          path="staff/roles"
          element={
            <RequirePermission permission="staff:view">
              <RolesTemplates />
            </RequirePermission>
          }
        />
        <Route
          path="staff/:id"
          element={
            <RequirePermission permission="staff:edit">
              <StaffForm />
            </RequirePermission>
          }
        />
        <Route
          path="audit-logs"
          element={
            <RequirePermission permission="audit:view">
              <AuditLogs />
            </RequirePermission>
          }
        />
        {PLACEHOLDERS.map((entry) => (
          <Route
            key={entry.path}
            path={entry.path}
            element={<Placeholder title={entry.title} milestone={entry.milestone} />}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
