import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Login } from '@/routes/Login';
import { Dashboard } from '@/routes/Dashboard';
import { Placeholder } from '@/routes/Placeholder';
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
  { path: 'staff', title: 'Staff Accounts', milestone: 'M1' },
  { path: 'staff/roles', title: 'Roles & Templates', milestone: 'M1' },
  { path: 'offices', title: 'Overseas Offices', milestone: 'M2' },
  { path: 'agents', title: 'Local Agents', milestone: 'M2' },
  { path: 'audit-logs', title: 'Audit Logs', milestone: 'M1' },
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
