import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Logo size="lg" />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass size={28} />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
