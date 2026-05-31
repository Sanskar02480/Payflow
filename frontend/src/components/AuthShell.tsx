import type { ReactNode } from 'react';
import Logo from './Logo';

interface Props {
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared layout for /login, /register, /forgot-password, /reset-password.
 * Restrained -- off-white background with a faint dot grid for character,
 * deliberately avoids the bright marketing gradient look.
 */
export default function AuthShell({ children, footer }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50/60 bg-dot-grid bg-dot-grid px-4 py-12">
      {/* Top-edge hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" />

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
