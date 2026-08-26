import {
  Archive,
  Building2,
  ClipboardList,
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
  label: string;
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
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Candidates',
    to: '/candidates',
    icon: Users,
    module: 'candidates',
    permission: 'candidates:view',
    children: [
      { label: 'Create CV', to: '/candidates/cv', icon: FileText, permission: 'candidates:edit' },
      { label: 'Create New', to: '/candidates/new', icon: UserPlus, permission: 'candidates:edit' },
      { label: 'List of Candidates', to: '/candidates', icon: ClipboardList, permission: 'candidates:view' },
      { label: 'Archived Candidates', to: '/candidates/archived', icon: Archive, permission: 'candidates:view' },
    ],
  },
  {
    label: 'Processing',
    to: '/processing',
    icon: Settings2,
    children: [
      { label: 'LMIS', to: '/processing/lmis', icon: FileText, module: 'lmis', permission: 'lmis:view' },
      { label: 'Embassy', to: '/processing/embassy', icon: Stamp, module: 'embassy', permission: 'embassy:view' },
    ],
  },
  {
    label: 'Ticket & Deployment',
    to: '/deployment',
    icon: PlaneTakeoff,
    children: [
      { label: 'Flight Tickets', to: '/deployment/tickets', icon: Ticket, module: 'tickets', permission: 'tickets:view' },
      { label: 'Issued Tickets', to: '/deployment/issued', icon: TicketCheck, module: 'tickets', permission: 'tickets:view' },
      { label: 'Departed List', to: '/deployment/departed', icon: Plane, module: 'deployments', permission: 'deployments:view' },
      { label: 'Returned List', to: '/deployment/returned', icon: RotateCcw, module: 'returns', permission: 'returns:view' },
    ],
  },
  {
    label: 'Staff Management',
    to: '/staff',
    icon: UsersRound,
    module: 'staff',
    permission: 'staff:view',
    children: [
      { label: 'Staff Accounts', to: '/staff', icon: UserCog, permission: 'staff:view' },
      { label: 'Roles & Templates', to: '/staff/roles', icon: ShieldCheck, permission: 'staff:edit' },
    ],
  },
  { label: 'Overseas Offices', to: '/offices', icon: Building2, module: 'offices', permission: 'offices:view' },
  { label: 'Local Agents', to: '/agents', icon: UserRound, module: 'agents', permission: 'agents:view' },
  { label: 'Audit Logs', to: '/audit-logs', icon: ClipboardList, module: 'audit', permission: 'audit:view' },
  { label: 'System Settings', to: '/settings', icon: Settings2, module: 'settings', permission: 'settings:view' },
  { label: 'Profile', to: '/profile', icon: UserRound },
];
