import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      toast.success(
        rememberMe ? 'Welcome back! Session will last 24 hours.' : 'Welcome back!',
      );
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to PayFlow</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="alice@payflow.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label !mb-0" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  minLength={8}
                  className="input pl-10"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <label
              htmlFor="remember"
              className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-700"
            >
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>
                Remember me
                <span className="ml-1 text-xs text-slate-400">(keep me signed in for 24h)</span>
              </span>
            </label>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Spinner /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secured by JWT · Rate-limited · ACID-compliant
        </p>
      </div>
    </div>
  );
}
