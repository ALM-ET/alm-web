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

/**
 * The staff directory, one page at a time.
 *
 * `page` is part of the query key, so moving between pages is a separate cached
 * fetch rather than a refetch that blanks the table.
 */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function useStaff(page = 1) {
  return useQuery({
    queryKey: [...staffKeys.all, page],
    queryFn: () => api.get<Paged<StaffAccount>>('/api/v1/staff', { query: { page } }),
    placeholderData: (previous) => previous,
  });
}

/**
 * One staff account, by id.
 *
 * The edit form used to search the directory it had already loaded, which
 * stopped working the moment that directory was paged: somebody on page three
 * was simply not found and the form opened blank over a real account.
 */
export function useStaffAccount(id: string | undefined) {
  return useQuery({
    queryKey: [...staffKeys.all, 'one', id],
    queryFn: () => api.get<StaffAccount>(`/api/v1/staff/${id}`),
    enabled: Boolean(id),
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

export type CocStatus = 'pending' | 'issued' | 'expired';

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
  /** Already reads `expired` once an issued certificate is past its validity. */
  cocStatus: CocStatus;
  cocCertifiedDate: string | null;
  cocExpiryDate: string | null;
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
  skills: string[];
  numberOfChildren: number | null;
  postAppliedFor: string | null;
  medicalIssueDate: string | null;
  medicalPlace: string | null;
  monthlySalary: string | null;
  contractPeriod: string | null;
  officeId: string | null;
  agentId: string | null;
  sponsorName: string | null;
  sponsorRef: string | null;
  sponsorPhone: string | null;
  sponsorAddress: string | null;
  sponsorArabicName: string | null;
  sponsorNationalId: string | null;
  wakalaNumber: string | null;
  enjazNumber: string | null;
  stickerVisaNumber: string | null;
  biometricId: string | null;
  cocType: string | null;
  cocCenterName: string | null;
  cocCertificateNumber: string | null;
  fullNameAmharic: string | null;
  relativeName: string | null;
  relativePhone: string | null;
  relativeKinship: string | null;
  relativeGender: string | null;
  relativeDateOfBirth: string | null;
  relativeRegion: string | null;
  relativeCity: string | null;
  relativeSubcity: string | null;
  relativeWereda: string | null;
  relativeHouseNumber: string | null;
  documents: CandidateDocument[];
}

export interface CandidateFilters {
  search: string;
  officeId: string;
  agentId: string;
  gender: string;
  religion: string;
  medicalStatus: string;
  cocStatus: string;
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
    ...(filters.cocStatus !== 'all' ? { cocStatus: filters.cocStatus } : {}),
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

/**
 * A whole list, for a dropdown.
 *
 * These endpoints are paged now, which is right for a screen and wrong for a
 * picker: a candidate form offering the first twenty-five offices and silently
 * omitting the twenty-sixth is worse than a slow page, because nobody notices.
 *
 * So the picker asks for the maximum page and follows on if there is more. In
 * practice an agency has a dozen offices and this is one request; the loop
 * exists so that the day one has three hundred, the form is still correct
 * rather than quietly wrong.
 */
async function everything<T>(path: string): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;

  for (;;) {
    const result = await api.get<Paged<T>>(path, { query: { page, pageSize: 100 } });
    collected.push(...result.items);

    if (!result.hasMore) return collected;
    page += 1;

    // A guard rather than a limit: if `hasMore` ever lies, this stops the tab
    // from spinning forever instead of hanging on a loop nobody can see.
    if (page > 50) return collected;
  }
}

export function useOffices() {
  return useQuery({
    queryKey: ['offices'],
    queryFn: () => everything<PartnerOffice>('/api/v1/offices'),
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => everything<FieldAgent>('/api/v1/agents'),
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

/* ---------------------------------------------------------------- pipeline */

export interface QueueRow {
  id: string;
  fullName: string;
  passportNumber: string;
  labourId: string;
  destinationCountry: string | null;
  stage: string;
  medicalStatus: string;
  visaNumber: string | null;
  visaDate: string | null;
  flightTicketDate: string | null;
  departureDate: string | null;
  returnDate: string | null;
  returnReason: string | null;
  gender: string | null;
  religion: string | null;
  lmisStatus: { id: string; name: string } | null;
  embassyStatus: { id: string; name: string } | null;
  ticketStatus: { id: string; name: string } | null;
  office: { id: string; name: string } | null;
  agent: { id: string; fullName: string } | null;
}

export interface TransitionOption {
  stage: string;
  label: string;
  direction: 'forward' | 'backward' | 'same';
  requiresReason: boolean;
  permitted: boolean;
  missing: string[];
  problem: string | null;
}

export interface StatusDefinition {
  id: string;
  category: 'lmis' | 'embassy' | 'ticket';
  name: string;
  position: number;
  isDefault: boolean;
}

export interface QueueFilters {
  search: string;
  statusId: string;
  gender: string;
  religion: string;
  page: number;
}

export const EMPTY_QUEUE_FILTERS: QueueFilters = {
  search: '',
  statusId: 'all',
  gender: 'all',
  religion: 'all',
  page: 1,
};

export function useQueue(queue: string, filters: QueueFilters) {
  return useQuery({
    queryKey: ['pipeline', queue, filters],
    queryFn: () =>
      api.get<{ items: QueueRow[]; total: number; page: number; pageSize: number }>(
        `/api/v1/pipeline/queues/${queue}`,
        {
          query: {
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.statusId !== 'all' ? { statusId: filters.statusId } : {}),
            ...(filters.gender !== 'all' ? { gender: filters.gender } : {}),
            ...(filters.religion !== 'all' ? { religion: filters.religion } : {}),
            page: filters.page,
          },
        },
      ),
    placeholderData: (previous) => previous,
  });
}

export function useTransitions(candidateId: string | null) {
  return useQuery({
    queryKey: ['pipeline', 'transitions', candidateId],
    queryFn: () =>
      api.get<{ stage: string; next: string | null; options: TransitionOption[] }>(
        `/api/v1/pipeline/candidates/${candidateId}/transitions`,
      ),
    enabled: Boolean(candidateId),
  });
}

export function useStageHistory(candidateId: string | null) {
  return useQuery({
    queryKey: ['pipeline', 'history', candidateId],
    queryFn: () =>
      api
        .get<{
          items: {
            id: string;
            fromStage: string | null;
            toStage: string;
            reason: string | null;
            actorName: string;
            createdAt: string;
          }[];
        }>(`/api/v1/pipeline/candidates/${candidateId}/history`)
        .then((r) => r.items),
    enabled: Boolean(candidateId),
  });
}

export function useAdvanceCandidate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      toStage,
      reason,
      patch,
    }: {
      id: string;
      toStage: string;
      reason?: string;
      patch?: Record<string, unknown>;
    }) =>
      api.post<QueueRow>(`/api/v1/pipeline/candidates/${id}/advance`, {
        toStage,
        ...(reason ? { reason } : {}),
        ...(patch ? { patch } : {}),
      }),
    onSuccess: () => {
      // A stage change moves the candidate between queues and shifts the
      // dashboard funnel, so nothing that touches them can stay cached.
      void client.invalidateQueries({ queryKey: ['pipeline'] });
      void client.invalidateQueries({ queryKey: ['candidates'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useStatuses(category?: 'lmis' | 'embassy' | 'ticket') {
  return useQuery({
    queryKey: ['statuses', category ?? 'all'],
    queryFn: () =>
      api
        .get<{ items: StatusDefinition[] }>('/api/v1/statuses', {
          query: category ? { category } : {},
        })
        .then((r) => r.items),
  });
}

function useStatusMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['statuses'] });
      void client.invalidateQueries({ queryKey: ['pipeline'] });
      void client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSaveStatus() {
  return useStatusMutation(({ id, ...input }: Record<string, unknown> & { id?: string }) =>
    id
      ? api.patch<StatusDefinition>(`/api/v1/statuses/${id}`, input)
      : api.post<StatusDefinition>('/api/v1/statuses', input),
  );
}

export function useDeleteStatus() {
  return useStatusMutation((id: string) => api.delete<void>(`/api/v1/statuses/${id}`));
}

/* --------------------------------------------------------------- dashboard */

export interface DashboardData {
  range: string;
  kpis: {
    total: number;
    registeredInRange: number;
    changePercent: number | null;
    processing: number;
    recentlyDeparted: number;
    pendingApprovals: number;
  };
  funnel: { stage: string; label: string; description: string; count: number }[];
  trend: { month: string; label: string; count: number }[];
  activity: {
    id: string;
    actorName: string;
    description: string;
    entityType: string;
    createdAt: string;
  }[];
}

export function useDashboard(range: string) {
  return useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => api.get<DashboardData>('/api/v1/dashboard', { query: { range } }),
    placeholderData: (previous) => previous,
  });
}
