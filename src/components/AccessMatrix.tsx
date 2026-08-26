import { useMemo } from 'react';
import { ACCESS_MATRIX_ROWS, ACTIONS, type ActionKey, type ModuleKey } from '@alm/sdk';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface AccessMatrixProps {
  /** Selected permission keys, e.g. `['candidates:view', 'lmis:edit']`. */
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Extra modules beyond the eight in the recorded matrix. */
  extraRows?: { module: ModuleKey; label: string }[];
}

const ACTION_LABEL: Record<ActionKey, string> = {
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
};

/**
 * The module × View / Edit / Delete grid from the recorded system.
 *
 * Two behaviours make it hard to configure something incoherent:
 *
 * - Ticking Edit or Delete implies View, because a permission to change
 *   records you cannot see is not a thing an agency can operate.
 * - Unticking View clears Edit and Delete for that row, for the same reason.
 *
 * The API enforces neither; it simply stores what it is given. This is a
 * usability guard, not a security one.
 */
export function AccessMatrix({ value, onChange, disabled = false, extraRows = [] }: AccessMatrixProps) {
  const rows = useMemo(() => [...ACCESS_MATRIX_ROWS, ...extraRows], [extraRows]);
  const selected = useMemo(() => new Set(value), [value]);

  const setKeys = (keys: string[], on: boolean) => {
    const next = new Set(selected);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    onChange([...next]);
  };

  const toggle = (module: ModuleKey, action: ActionKey, on: boolean) => {
    const key = `${module}:${action}`;

    if (on) {
      setKeys(action === 'view' ? [key] : [key, `${module}:view`], true);
      return;
    }

    if (action === 'view') {
      setKeys(ACTIONS.map((a) => `${module}:${a}`), false);
      return;
    }

    setKeys([key], false);
  };

  const bulk = (mode: 'all' | 'view' | 'none') => {
    if (mode === 'none') return onChange([]);
    if (mode === 'view') return onChange(rows.map((row) => `${row.module}:view`));
    onChange(rows.flatMap((row) => ACTIONS.map((action) => `${row.module}:${action}`)));
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="font-semibold">Module access</h3>
          <p className="text-sm text-muted-foreground">
            Choose what this account can see, change and remove in each module.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => bulk('all')}>
            Grant all
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => bulk('view')}>
            View only
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => bulk('none')}>
            Clear all
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr>
              <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-accent">
                Module
              </th>
              {ACTIONS.map((action) => (
                <th
                  key={action}
                  className="w-24 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-accent"
                >
                  {ACTION_LABEL[action]}
                </th>
              ))}
              <th className="w-28 px-4 py-3 text-end text-xs font-bold uppercase tracking-wide text-accent">
                Row
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const rowKeys = ACTIONS.map((action) => `${row.module}:${action}`);
              const allOn = rowKeys.every((key) => selected.has(key));

              return (
                <tr key={row.module} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{row.label}</td>

                  {ACTIONS.map((action) => {
                    const key = `${row.module}:${action}`;
                    const id = `perm-${key}`;
                    return (
                      <td key={action} className="px-4 py-3 text-center">
                        <Checkbox
                          id={id}
                          className="mx-auto"
                          checked={selected.has(key)}
                          disabled={disabled}
                          onCheckedChange={(state) => toggle(row.module, action, state === true)}
                          aria-label={`${ACTION_LABEL[action]} ${row.label}`}
                        />
                      </td>
                    );
                  })}

                  <td className="px-4 py-3 text-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      className={cn('text-xs', allOn && 'text-muted-foreground')}
                      onClick={() => setKeys(rowKeys, !allOn)}
                    >
                      {allOn ? 'Clear' : 'Select all'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        {value.length} {value.length === 1 ? 'permission' : 'permissions'} selected
      </p>
    </div>
  );
}
