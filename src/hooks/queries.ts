import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------- types */

export interface StaffAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  roleId: string | null;
  roleLabel: string;
  isOwner: boolean;
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isTemplate: boolean;
  permissions: string[];
  assignedCount: number;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  actorName: string;
  actorUsername: string | null;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  description: string;
  clientIp: string | null;
  userAgent: string | null;
  diff: unknown;
}

export interface AuditSummary {
  total: number;
  last24h: number;
  activeAdmins: number;
  securityEvents: number;
}

/* ------------------------------------------------------------------ staff */

export const staffKeys = {
  all: ['staff'] as const,
  roles: ['roles'] as const,
};

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: () => api.get<{ items: StaffAccount[] }>('/api/v1/staff').then((r) => r.items),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: staffKeys.roles,
    queryFn: () => api.get<{ items: RoleSummary[] }>('/api/v1/roles').then((r) => r.items),
  });
}

/**
 * Invalidate everything a permission change can affect — including the
 * bootstrap payload, since editing your own role changes your own menu.
 */
function useAccessMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  options?: UseMutationOptions<TResult, unknown, TArgs>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    ...options,
    onSuccess: (...args) => {
      void client.invalidateQueries({ queryKey: staffKeys.all });
      void client.invalidateQueries({ queryKey: staffKeys.roles });
      void client.invalidateQueries({ queryKey: ['audit'] });
      options?.onSuccess?.(...args);
    },
  });
}

export interface StaffInput {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  roleId: string | null;
  permissions: string[];
}

export function useCreateStaff() {
  return useAccessMutation((input: StaffInput) => api.post<StaffAccount>('/api/v1/staff', input));
}

export function useUpdateStaff() {
  return useAccessMutation(({ id, ...input }: Partial<StaffInput> & { id: string; status?: string }) =>
    api.patch<StaffAccount>(`/api/v1/staff/${id}`, input),
  );
}

export function useDeleteStaff() {
  return useAccessMutation((id: string) => api.delete<void>(`/api/v1/staff/${id}`));
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export function useCreateRole() {
  return useAccessMutation((input: RoleInput) => api.post<RoleSummary>('/api/v1/roles', input));
}

export function useUpdateRole() {
  return useAccessMutation(({ id, ...input }: Partial<RoleInput> & { id: string }) =>
    api.patch<RoleSummary>(`/api/v1/roles/${id}`, input),
  );
}

export function useDeleteRole() {
  return useAccessMutation((id: string) => api.delete<void>(`/api/v1/roles/${id}`));
}

/* ------------------------------------------------------------------ audit */

export interface AuditFilters {
  search: string;
  action: string;
  entityType: string;
  page: number;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', 'list', filters],
    queryFn: () =>
      api.get<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>(
        '/api/v1/audit-logs',
        {
          query: {
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.action !== 'all' ? { action: filters.action } : {}),
            ...(filters.entityType !== 'all' ? { entityType: filters.entityType } : {}),
            page: filters.page,
          },
        },
      ),
    // Keeps the table on screen while a new page loads instead of flashing empty.
    placeholderData: (previous) => previous,
  });
}

export function useAuditSummary() {
  return useQuery({
    queryKey: ['audit', 'summary'],
    queryFn: () => api.get<AuditSummary>('/api/v1/audit-logs/summary'),
  });
}

export function useAuditEntityTypes() {
  return useQuery({
    queryKey: ['audit', 'entity-types'],
    queryFn: () => api.get<{ items: string[] }>('/api/v1/audit-logs/entity-types').then((r) => r.items),
  });
}
