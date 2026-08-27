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


/* ------------------------------------------------------------- recruitment */

export interface CandidateRow {
  id: string;
  fullName: string;
  passportNumber: string;
  applicationId: string | null;
  labourId: string;
  selectionStatus: string;
  visaNumber: string | null;
  visaDate: string | null;
  medicalStatus: string;
  stage: string;
  destinationCountry: string | null;
  gender: string | null;
  religion: string | null;
  phone: string | null;
  archivedAt: string | null;
  createdAt: string;
  office: { id: string; name: string } | null;
  agent: { id: string; fullName: string } | null;
}

export interface CandidateDocument {
  id: string;
  kind: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  scanStatus: string;
  scanNote: string | null;
  createdAt: string;
}

export interface CandidateDetail extends CandidateRow {
  passportIssueDate: string | null;
  passportExpiryDate: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  maritalStatus: string | null;
  weightKg: number | null;
  heightCm: number | null;
  currentOccupation: string | null;
  educationLevel: string | null;
  englishLevel: string | null;
  arabicLevel: string | null;
  workedAbroad: boolean;
  skillsNotes: string | null;
  postAppliedFor: string | null;
  medicalIssueDate: string | null;
  monthlySalary: string | null;
  contractPeriod: string | null;
  officeId: string | null;
  agentId: string | null;
  sponsorName: string | null;
  sponsorRef: string | null;
  sponsorPhone: string | null;
  sponsorAddress: string | null;
  documents: CandidateDocument[];
}

export interface CandidateFilters {
  search: string;
  officeId: string;
  agentId: string;
  gender: string;
  religion: string;
  medicalStatus: string;
  archived: boolean;
  page: number;
}

export interface PartnerOffice {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string | null;
  hasLogin: boolean;
  candidateCount: number;
  createdAt: string;
}

export interface FieldAgent {
  id: string;
  fullName: string;
  phone: string | null;
  region: string | null;
  candidateCount: number;
  createdAt: string;
}

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (filters: CandidateFilters) => ['candidates', 'list', filters] as const,
  detail: (id: string) => ['candidates', 'detail', id] as const,
  summary: ['candidates', 'summary'] as const,
};

export function candidateQuery(filters: CandidateFilters) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.officeId !== 'all' ? { officeId: filters.officeId } : {}),
    ...(filters.agentId !== 'all' ? { agentId: filters.agentId } : {}),
    ...(filters.gender !== 'all' ? { gender: filters.gender } : {}),
    ...(filters.religion !== 'all' ? { religion: filters.religion } : {}),
    ...(filters.medicalStatus !== 'all' ? { medicalStatus: filters.medicalStatus } : {}),
    ...(filters.archived ? { archived: 'true' } : {}),
    page: filters.page,
  };
}

export function useCandidates(filters: CandidateFilters) {
  return useQuery({
    queryKey: candidateKeys.list(filters),
    queryFn: () =>
      api.get<{ items: CandidateRow[]; total: number; page: number; pageSize: number }>(
        '/api/v1/candidates',
        { query: candidateQuery(filters) },
      ),
    placeholderData: (previous) => previous,
  });
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: candidateKeys.detail(id ?? ''),
    queryFn: () => api.get<CandidateDetail>(`/api/v1/candidates/${id}`),
    enabled: Boolean(id),
  });
}

export function useCandidateSummary() {
  return useQuery({
    queryKey: candidateKeys.summary,
    queryFn: () =>
      api.get<{ total: number; processing: number; visaSecured: number; activeAgents: number }>(
        '/api/v1/candidates/summary',
      ),
  });
}

function useCandidateMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: candidateKeys.all });
      void client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useCreateCandidate() {
  return useCandidateMutation((input: Record<string, unknown>) =>
    api.post<CandidateDetail>('/api/v1/candidates', input),
  );
}

export function useUpdateCandidate() {
  return useCandidateMutation(({ id, ...input }: Record<string, unknown> & { id: string }) =>
    api.patch<CandidateDetail>(`/api/v1/candidates/${id}`, input),
  );
}

export function useArchiveCandidate() {
  return useCandidateMutation(({ id, archived }: { id: string; archived: boolean }) =>
    api.post<CandidateDetail>(`/api/v1/candidates/${id}/${archived ? 'restore' : 'archive'}`),
  );
}

export function useUploadDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file, kind }: { id: string; file: File; kind: string }) => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', file);
      return api.postForm<CandidateDocument>(`/api/v1/candidates/${id}/documents`, form);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: candidateKeys.all }),
  });
}

export function useDeleteDocument() {
  return useCandidateMutation(({ id, documentId }: { id: string; documentId: string }) =>
    api.delete<void>(`/api/v1/candidates/${id}/documents/${documentId}`),
  );
}

/* ------------------------------------------------------- offices and agents */

export function useOffices() {
  return useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get<{ items: PartnerOffice[] }>('/api/v1/offices').then((r) => r.items),
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<{ items: FieldAgent[] }>('/api/v1/agents').then((r) => r.items),
  });
}

function usePartnerMutation<TArgs, TResult>(key: string, fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [key] });
      void client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSaveOffice() {
  return usePartnerMutation('offices', ({ id, ...input }: Record<string, unknown> & { id?: string }) =>
    id
      ? api.patch<PartnerOffice>(`/api/v1/offices/${id}`, input)
      : api.post<PartnerOffice>('/api/v1/offices', input),
  );
}

export function useDeleteOffice() {
  return usePartnerMutation('offices', (id: string) => api.delete<void>(`/api/v1/offices/${id}`));
}

export function useSaveAgent() {
  return usePartnerMutation('agents', ({ id, ...input }: Record<string, unknown> & { id?: string }) =>
    id
      ? api.patch<FieldAgent>(`/api/v1/agents/${id}`, input)
      : api.post<FieldAgent>('/api/v1/agents', input),
  );
}

export function useDeleteAgent() {
  return usePartnerMutation('agents', (id: string) => api.delete<void>(`/api/v1/agents/${id}`));
}
