import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Paging controls for a list.
 *
 * Says how many rows there are and which of them you are looking at, rather
 * than only offering arrows: "1–25 of 412" is the difference between a list
 * somebody trusts and one where they wonder what they are not being shown.
 *
 * Renders nothing when everything fits on one page, which is the common case
 * for a small agency and where a disabled pair of arrows would just be noise.
 */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
  labels,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  /** Supplied by the caller so this component needs no translation context. */
  labels?: { showing?: string; previous?: string; next?: string };
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {labels?.showing ?? 'Showing'} {first}–{last} of {total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={labels?.previous ?? 'Previous page'}
        >
          <ChevronLeft />
          {labels?.previous ?? 'Previous'}
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label={labels?.next ?? 'Next page'}
        >
          {labels?.next ?? 'Next'}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
