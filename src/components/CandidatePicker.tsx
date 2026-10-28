import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCandidates, type CandidateRef } from '@/hooks/queries';

/**
 * Choose one candidate by typing part of a name or passport number.
 *
 * Searches the server rather than a preloaded list: an agency with thousands of
 * candidates cannot ship them all to a dropdown.
 */
export function CandidatePicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: CandidateRef | null;
  onChange: (candidate: CandidateRef | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const { data, isFetching } = useCandidates({
    search,
    officeId: 'all',
    agentId: 'all',
    gender: 'all',
    religion: 'all',
    medicalStatus: 'all',
    cocStatus: 'all',
    medicalExpiry: 'all',
    archived: false,
    page: 1,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{value.fullName}</span>
          <span className="ms-2 font-mono text-xs text-muted-foreground">{value.passportNumber}</span>
        </span>
        {!disabled && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} aria-label="Change candidate">
            <X />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        id={id}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Type a name or passport number…"
        autoComplete="off"
      />
      {search.length >= 2 && (
        <ul className="max-h-48 overflow-auto rounded-md border text-sm">
          {isFetching && !data && (
            <li className="px-3 py-2">
              <Loader2 className="size-4 animate-spin" />
            </li>
          )}
          {data?.items.slice(0, 8).map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-muted"
                onClick={() =>
                  onChange({
                    id: candidate.id,
                    fullName: candidate.fullName,
                    passportNumber: candidate.passportNumber,
                  })
                }
              >
                <span>{candidate.fullName}</span>
                <span className="font-mono text-xs text-muted-foreground">{candidate.passportNumber}</span>
              </button>
            </li>
          ))}
          {data && !data.items.length && (
            <li className="px-3 py-2 text-muted-foreground">No candidate matches “{search}”.</li>
          )}
        </ul>
      )}
    </div>
  );
}
