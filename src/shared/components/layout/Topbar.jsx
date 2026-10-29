import { Button, Logo } from '@/shared/components/ui';
import { Menu } from '@/shared/icons';
import { UserMenu } from './UserMenu';

/**
 * Top bar of the workspace shell. Below lg it shows the menu button (opens the navigation
 * drawer) and the logo; the desktop sidebar carries the logo on large screens.
 */
export function Topbar({ onMenuClick, roleLabel, homeTo = '/', menuOpen = false }) {
  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <div className="-ml-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Open navigation"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-w-0 lg:hidden">
          <Logo to={homeTo} size="sm" />
        </div>

        {roleLabel ? (
          <p className="hidden text-sm font-medium text-slate-500 lg:block">{roleLabel} workspace</p>
        ) : null}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
