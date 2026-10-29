import { useNavigate } from 'react-router-dom';
import { Avatar, DropdownMenu, toast } from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import {
  ROLES,
  ROLE_HOME,
  ROLE_LABELS,
  ROLE_PRIORITY,
  ROUTES,
  getHomeRoute,
} from '@/shared/constants';
import { Briefcase, ChevronDown, LayoutDashboard, LogOut, User } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * Avatar menu for signed-in users (navbar and dashboard top bar).
 * Users with several roles get one dashboard entry per role.
 */
export function UserMenu({ className }) {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
    toast.info('You have been logged out.');
  };

  const userRoles = ROLE_PRIORITY.filter((role) => hasRole(role));
  const dashboardItems =
    userRoles.length > 1
      ? userRoles.map((role) => ({
          label: `${ROLE_LABELS[role]} dashboard`,
          icon: LayoutDashboard,
          to: ROLE_HOME[role],
        }))
      : [{ label: 'Dashboard', icon: LayoutDashboard, to: getHomeRoute(user) }];

  const items = [
    ...dashboardItems,
    ...(hasRole(ROLES.STUDENT) ? [{ label: 'Profile', icon: User, to: ROUTES.PROFILE }] : []),
    { label: 'Browse internships', icon: Briefcase, to: ROUTES.CATALOG },
    { divider: true },
    {
      label: 'Log out',
      icon: LogOut,
      danger: true,
      onClick: () => {
        void handleLogout();
      },
    },
  ];

  const name = user.name || user.email || 'Account';

  const label = (
    <span className="block max-w-[15rem] normal-case tracking-normal">
      <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
      {user.email ? (
        <span className="block truncate text-xs font-normal text-slate-500">{user.email}</span>
      ) : null}
    </span>
  );

  const trigger = (
    <button
      type="button"
      aria-label={`${name}, account menu`}
      className={cn(
        'flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        className,
      )}
    >
      <Avatar name={name} size="sm" />
      <span className="hidden max-w-[10rem] truncate sm:block">{name}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );

  return <DropdownMenu trigger={trigger} items={items} label={label} align="end" />;
}

export default UserMenu;
