import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  GraduationCap,
  History,
  Inbox,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  User,
  UserCog,
  Users,
} from '@/shared/icons';
import { ROUTES, paths } from '@/shared/constants';

/**
 * Navigation config for the shell (no JSX: icons are component references).
 *
 * Sidebar sections: [{ title?, items: [NavItem] }]
 * NavItem: {
 *   label, to, icon,
 *   end?          exact match only (NavLink `end`),
 *   badge?        small count shown on the right (hidden when 0/empty),
 *   badgeLabel?   screen-reader text for the badge, e.g. "3 pending reviews",
 *   hidden?       skip the item (e.g. Team for students without a team),
 *   activePaths?  extra route patterns that also highlight the item
 * }
 */

/** "How it works" lives on the home page as a section with id="how-it-works". */
export const HOW_IT_WORKS_PATH = '/#how-it-works';

/** Links in the public navbar (desktop + mobile drawer). `anchor` = in-page section, never "active". */
export const PUBLIC_NAV_LINKS = Object.freeze([
  { label: 'Internships', to: ROUTES.CATALOG },
  { label: 'How it works', to: HOW_IT_WORKS_PATH, anchor: true },
  { label: 'Verify certificate', to: ROUTES.VERIFY_CERTIFICATE },
]);

const MAX_BADGE = 99;

function formatBadge(count) {
  return count > MAX_BADGE ? `${MAX_BADGE}+` : count;
}

/** Student workspace. The Team link only appears once the student belongs to a team. */
export function getStudentNavigation({ teamId } = {}) {
  return [
    {
      title: 'Learning',
      items: [
        { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard, end: true },
        { label: 'Schedule', to: ROUTES.SCHEDULE, icon: CalendarDays },
        { label: 'Tasks', to: ROUTES.TASKS, icon: ClipboardList },
        {
          label: 'Team',
          to: teamId ? paths.team(teamId) : ROUTES.TEAM_NEW,
          icon: Users,
          hidden: !teamId,
        },
        { label: 'Certificate', to: ROUTES.CERTIFICATE, icon: Award },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', to: ROUTES.PROFILE, icon: User },
        { label: 'Browse internships', to: ROUTES.CATALOG, icon: Briefcase },
      ],
    },
  ];
}

/** Trainer workspace. The review queue shows how many submissions wait for a review. */
export function getTrainerNavigation({ pendingCount = 0 } = {}) {
  const count = Math.max(0, Number(pendingCount) || 0);
  return [
    {
      items: [
        {
          label: 'Review queue',
          to: ROUTES.TRAINER,
          icon: Inbox,
          end: true,
          activePaths: [ROUTES.TRAINER_REVIEW],
          badge: count > 0 ? formatBadge(count) : undefined,
          badgeLabel:
            count > 0 ? `${count} pending ${count === 1 ? 'review' : 'reviews'}` : undefined,
        },
        { label: 'Reports', to: ROUTES.TRAINER_REPORTS, icon: BarChart3 },
      ],
    },
  ];
}

/** Admin console, grouped the way admins think about the work (KD1). */
export function getAdminNavigation() {
  return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', to: ROUTES.ADMIN, icon: LayoutDashboard, end: true }],
    },
    {
      title: 'People',
      items: [
        { label: 'Users', to: ROUTES.ADMIN_USERS, icon: Users },
        { label: 'Trainer assignments', to: ROUTES.ADMIN_ASSIGNMENTS, icon: UserCog },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { label: 'Designations', to: ROUTES.ADMIN_DESIGNATIONS, icon: Briefcase },
        { label: 'Domains', to: ROUTES.ADMIN_DOMAINS, icon: Building2 },
        { label: 'Plans & pricing', to: ROUTES.ADMIN_PLANS, icon: IndianRupee },
        { label: 'Assessments', to: ROUTES.ADMIN_ASSESSMENTS, icon: ClipboardCheck },
      ],
    },
    {
      title: 'Learning',
      items: [
        { label: 'Schedules', to: ROUTES.ADMIN_SCHEDULES, icon: CalendarDays },
        { label: 'Tasks', to: ROUTES.ADMIN_TASKS, icon: ListChecks },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Enrollments', to: ROUTES.ADMIN_ENROLLMENTS, icon: GraduationCap },
        { label: 'Payments', to: ROUTES.ADMIN_PAYMENTS, icon: CreditCard },
        { label: 'Certificates', to: ROUTES.ADMIN_CERTIFICATES, icon: Award },
        { label: 'Audit log', to: ROUTES.ADMIN_AUDIT, icon: History },
      ],
    },
  ];
}
