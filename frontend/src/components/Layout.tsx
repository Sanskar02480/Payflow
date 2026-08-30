import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, History, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initialsFromEmail } from '../lib/format';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transfer', label: 'Send Money', icon: Send },
  { to: '/history', label: 'Transactions', icon: History },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white'
      : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
  }`;

export default function Layout() {
  const { email, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-slate-950 transition-colors duration-150">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200/70 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <Logo />
            <div className="flex items-center gap-1">
              <ThemeToggle size="sm" />
              <button
                className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Menu
            </p>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass}
              >
                <item.icon size={16} strokeWidth={1.8} className="shrink-0" />
                {item.label}
              </NavLink>
            ))}

            {role === 'ADMIN' && (
              <>
                <div className="px-3 pb-1.5 pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Admin
                  </p>
                </div>
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass}
                >
                  <ShieldCheck size={16} strokeWidth={1.8} className="shrink-0" />
                  All Transactions
                </NavLink>
              </>
            )}
          </nav>

          <div className="border-t border-slate-200/70 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between rounded-md px-2 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-brand-600">
                  {email ? initialsFromEmail(email) : '??'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{email}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{role}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-normal text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
            >
              <LogOut size={16} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
            className="rounded-md p-1 text-slate-600 dark:text-slate-400"
          >
            <Menu size={20} />
          </button>
          <Logo size="sm" />
          <ThemeToggle size="sm" />
        </header>

        <main className="flex-1 animate-fade-in px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
