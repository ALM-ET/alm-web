import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import type { Permission } from '@alm/sdk';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Login } from '@/routes/Login';
import { Dashboard } from '@/routes/Dashboard';
import { Placeholder } from '@/routes/Placeholder';
import { CvBuilder } from '@/routes/candidates/CvBuilder';
import { Reports } from '@/routes/Reports';
import { StaffAccounts } from '@/routes/staff/StaffAccounts';
import { StaffForm } from '@/routes/staff/StaffForm';
import { RolesTemplates } from '@/routes/staff/RolesTemplates';
import { AuditLogs } from '@/routes/AuditLogs';
import { CandidateDirectory } from '@/routes/candidates/CandidateDirectory';
import { CandidateForm } from '@/routes/candidates/CandidateForm';
import { Offices } from '@/routes/partners/Offices';
import { SystemSettings } from '@/routes/SystemSettings';
import {
  DepartedQueue,
  EmbassyQueue,
  IssuedTicketsQueue,
  LmisQueue,
  ReturnedQueue,
  TicketsQueue,
} from '@/routes/pipeline/QueueScreen';
import { Agents } from '@/routes/partners/Agents';
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
          path="candidates"
          element={
            <RequirePermission permission="candidates:view">
              <CandidateDirectory />
            </RequirePermission>
          }
        />
        <Route
          path="candidates/archived"
          element={
            <RequirePermission permission="candidates:view">
              <CandidateDirectory archived />
            </RequirePermission>
          }
        />
        <Route
          path="candidates/new"
          element={
            <RequirePermission permission="candidates:edit">
              <CandidateForm />
            </RequirePermission>
          }
        />
        <Route
          path="candidates/:id"
          element={
            <RequirePermission permission="candidates:view">
              <CandidateForm />
            </RequirePermission>
          }
        />
        <Route
          path="offices"
          element={
            <RequirePermission permission="offices:view">
              <Offices />
            </RequirePermission>
          }
        />
        <Route
          path="agents"
          element={
            <RequirePermission permission="agents:view">
              <Agents />
            </RequirePermission>
          }
        />
        <Route
          path="processing/lmis"
          element={
            <RequirePermission permission="lmis:view">
              <LmisQueue />
            </RequirePermission>
          }
        />
        <Route
          path="processing/embassy"
          element={
            <RequirePermission permission="embassy:view">
              <EmbassyQueue />
            </RequirePermission>
          }
        />
        <Route
          path="deployment/tickets"
          element={
            <RequirePermission permission="tickets:view">
              <TicketsQueue />
            </RequirePermission>
          }
        />
        <Route
          path="deployment/issued"
          element={
            <RequirePermission permission="tickets:view">
              <IssuedTicketsQueue />
            </RequirePermission>
          }
        />
        <Route
          path="deployment/departed"
          element={
            <RequirePermission permission="deployments:view">
              <DepartedQueue />
            </RequirePermission>
          }
        />
        <Route
          path="deployment/returned"
          element={
            <RequirePermission permission="returns:view">
              <ReturnedQueue />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission permission="settings:view">
              <SystemSettings />
            </RequirePermission>
          }
        />
        <Route
          path="candidates/cv"
          element={
            <RequirePermission permission="cv:view">
              <CvBuilder />
            </RequirePermission>
          }
        />
        <Route
          path="reports"
          element={
            <RequirePermission permission="reports:view">
              <Reports />
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
