import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/auth';

/**
 * M0 placeholder. The real dashboard — KPI cards, the seven-stage pipeline
 * funnel, the monthly trend chart, quick actions and the activity feed — is
 * built in M3, once there is pipeline data to render.
 */
export function Dashboard() {
  const { bootstrap } = useAuth();
  const user = bootstrap?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.fullName}</h1>
        <p className="mt-1 text-muted-foreground">Here is your recruitment pipeline overview for today.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundations are in place</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Signed in to <span className="font-medium text-foreground">{bootstrap?.tenant?.legalName}</span> as{' '}
            <span className="font-medium text-foreground">{user?.roleLabel}</span>.
          </p>
          <p>
            {bootstrap?.permissions.length} permissions resolved · {bootstrap?.modules.length} modules enabled.
          </p>
          <p>Pipeline metrics arrive in M3, once candidates and stages exist.</p>
        </CardContent>
      </Card>
    </div>
  );
}
