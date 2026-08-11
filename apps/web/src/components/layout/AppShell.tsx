import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/clerk-react';
import {
  Sparkles,
  LayoutDashboard,
  Send,
  PiggyBank,
  BarChart3,
  BrainCircuit,
  Menu,
  X,
} from 'lucide-react';
import { setTokenProvider } from '../../lib/api';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: Send },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/intelligence', label: 'Intelligence', icon: BrainCircuit },
  { to: '/app/coach', label: 'Coach', icon: Sparkles },
  { to: '/app/goals', label: 'Goals', icon: PiggyBank },
];

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <TokenBridge />

      {/* Mobile Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-ink/8 bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-ink text-canvas">
            <Sparkles className="size-4 text-amber-400" />
          </div>
          <span className="font-bold tracking-tight text-ink">Finora AI</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="rounded-md p-2 text-ink-muted hover:bg-ink/5 hover:text-ink focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink/8 bg-surface px-4 py-5 transition-transform duration-200 ease-in-out lg:static lg:w-60 lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-ink text-canvas shadow-xs">
            <Sparkles className="size-4 text-amber-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-ink">Finora AI</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-ink text-ink-inverse shadow-xs'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                ].join(' ')
              }
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <UserProfileFooter />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function TokenBridge() {
  const { getToken } = useAuth();

  // Set provider immediately so synchronous initial queries can resolve getToken
  setTokenProvider(async () => getToken());

  useEffect(() => {
    setTokenProvider(async () => getToken());
  }, [getToken]);

  return null;
}

function UserProfileFooter() {
  const { user } = useUser();

  return (
    <div className="flex items-center justify-between border-t border-ink/8 px-2 pt-4">
      <div className="flex items-center gap-3 overflow-hidden">
        <UserButton />
        <div className="flex flex-col truncate text-xs">
          <span className="truncate font-medium text-ink">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}
          </span>
          <span className="truncate text-ink-muted text-[11px]">Free Tier</span>
        </div>
      </div>
    </div>
  );
}