import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import AuthShell from '../components/AuthShell';
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
        rememberMe ? 'Welcome back. Session will last 24 hours.' : 'Welcome back.',
      );
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      footer={
        <p className="mt-5 text-center text-[11px] uppercase tracking-wider text-slate-400">
          JWT · Rate-limited · ACID-compliant
        </p>
      }
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back to your wallet.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input pl-9"
              placeholder="you@payflow.dev"
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
              className="text-[11px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              className="input pl-9"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <label
          htmlFor="remember"
          className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700"
        >
          <input
            id="remember"
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>
            Remember me{' '}
            <span className="text-xs text-slate-400">(keep signed in for 24h)</span>
          </span>
        </label>

        <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
          {submitting ? <Spinner /> : <>Sign in <ArrowRight size={14} /></>}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          New to PayFlow?{' '}
          <Link to="/register" className="font-medium text-slate-900 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
