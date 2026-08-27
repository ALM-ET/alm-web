import {
  Archive,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Plane,
  PlaneTakeoff,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Stamp,
  Ticket,
  TicketCheck,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey, Permission } from '@alm/sdk';

export interface NavItem {
  /** English label, and the fallback when nothing is translated. */
  label: string;
  /** Translation key; see `useT`. */
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this permission. */
  permission?: Permission;
  /** Hidden unless the module is enabled for the tenant. */
  module?: ModuleKey;
  children?: NavItem[];
}

/**
 * The sidebar, mirroring the recorded system exactly — same order, same
 * grouping, same labels. Every entry declares the permission and module that
 * gate it, so M1 (roles) and M4 (module toggles) light up without editing this
 * file again.
 */
export const NAVIGATION: NavItem[] = [
  { label: 'Dashboard', labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Candidates', labelKey: 'nav.candidates',
    to: '/candidates',
    icon: Users,
    module: 'candidates',
    permission: 'candidates:view',
    children: [
      { label: 'Create CV', labelKey: 'nav.create_cv', to: '/candidates/cv', icon: FileText, module: 'cv', permission: 'cv:view' },
      { label: 'Create New', labelKey: 'nav.create_new', to: '/candidates/new', icon: UserPlus, permission: 'candidates:edit' },
      { label: 'List of Candidates', labelKey: 'nav.list_candidates', to: '/candidates', icon: ClipboardList, permission: 'candidates:view' },
      { label: 'Archived Candidates', labelKey: 'nav.archived_candidates', to: '/candidates/archived', icon: Archive, permission: 'candidates:view' },
    ],
  },
  {
    label: 'Processing', labelKey: 'nav.processing',
    to: '/processing',
    icon: Settings2,
    children: [
      { label: 'LMIS', labelKey: 'nav.lmis', to: '/processing/lmis', icon: FileText, module: 'lmis', permission: 'lmis:view' },
      { label: 'Embassy', labelKey: 'nav.embassy', to: '/processing/embassy', icon: Stamp, module: 'embassy', permission: 'embassy:view' },
    ],
  },
  {
    label: 'Ticket & Deployment', labelKey: 'nav.ticket_deployment',
    to: '/deployment',
    icon: PlaneTakeoff,
    children: [
      { label: 'Flight Tickets', labelKey: 'nav.flight_tickets', to: '/deployment/tickets', icon: Ticket, module: 'tickets', permission: 'tickets:view' },
      { label: 'Issued Tickets', labelKey: 'nav.issued_tickets', to: '/deployment/issued', icon: TicketCheck, module: 'tickets', permission: 'tickets:view' },
      { label: 'Departed List', labelKey: 'nav.departed_list', to: '/deployment/departed', icon: Plane, module: 'deployments', permission: 'deployments:view' },
      { label: 'Returned List', labelKey: 'nav.returned_list', to: '/deployment/returned', icon: RotateCcw, module: 'returns', permission: 'returns:view' },
    ],
  },
  {
    label: 'Staff Management', labelKey: 'nav.staff_management',
    to: '/staff',
    icon: UsersRound,
    module: 'staff',
    permission: 'staff:view',
    children: [
      { label: 'Staff Accounts', labelKey: 'nav.staff_accounts', to: '/staff', icon: UserCog, permission: 'staff:view' },
      { label: 'Roles & Templates', labelKey: 'nav.roles_templates', to: '/staff/roles', icon: ShieldCheck, permission: 'staff:edit' },
    ],
  },
  { label: 'Overseas Offices', labelKey: 'nav.overseas_offices', to: '/offices', icon: Building2, module: 'offices', permission: 'offices:view' },
  { label: 'Local Agents', labelKey: 'nav.local_agents', to: '/agents', icon: UserRound, module: 'agents', permission: 'agents:view' },
  { label: 'Reports', labelKey: 'nav.reports', to: '/reports', icon: FileSpreadsheet, module: 'reports', permission: 'reports:view' },
  { label: 'Audit Logs', labelKey: 'nav.audit_logs', to: '/audit-logs', icon: ClipboardList, module: 'audit', permission: 'audit:view' },
  { label: 'System Settings', labelKey: 'nav.system_settings', to: '/settings', icon: Settings2, module: 'settings', permission: 'settings:view' },
  { label: 'Profile', labelKey: 'nav.profile', to: '/profile', icon: UserRound },
];
