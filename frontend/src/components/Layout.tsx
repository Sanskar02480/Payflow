import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, History, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initialsFromEmail } from '../lib/format';
import Logo from './Logo';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transfer', label: 'Send Money', icon: Send },
  { to: '/history', label: 'Transactions', icon: History },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-slate-100 font-medium text-slate-900'
      : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
    <div className="flex min-h-screen bg-slate-50/60">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200/70 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <Logo />
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="px-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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

          <div className="border-t border-slate-200/70 p-3">
            <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                {email ? initialsFromEmail(email) : '??'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{email}</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">{role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-normal text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/70 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Open sidebar">
            <Menu size={20} className="text-slate-600" />
          </button>
          <Logo size="sm" />
          <div className="w-6" />
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
