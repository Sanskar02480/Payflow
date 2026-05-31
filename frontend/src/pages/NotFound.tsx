import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50/60 bg-dot-grid bg-dot-grid px-4 text-center">
      <Logo size="lg" />
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Error 404
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
