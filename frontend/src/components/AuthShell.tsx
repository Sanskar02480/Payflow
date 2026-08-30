import type { ReactNode } from 'react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

interface Props {
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared layout for /login, /register, /forgot-password, /reset-password.
 */
export default function AuthShell({ children, footer }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50/60 bg-dot-grid dark:bg-slate-950 dark:bg-dot-grid-dark px-4 py-12 transition-colors duration-150">
      {/* Top-edge hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent dark:via-slate-700/60" />

      {/* Top-right theme toggle */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle size="sm" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-7 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card p-7">{children}</div>
        {footer}
      </div>
    </div>
  );
}
