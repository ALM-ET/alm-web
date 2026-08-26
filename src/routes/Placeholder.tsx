import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Stands in for a screen scheduled in a later milestone. Named after the
 * milestone so it is obvious in the UI what is coming and when.
 */
export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex items-center gap-4 py-10">
          <Construction className="size-8 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Scheduled for {milestone}</p>
            <p className="text-sm text-muted-foreground">
              The route, its navigation entry and its permission gate are already wired — only the screen itself is
              pending.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
