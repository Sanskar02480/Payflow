import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, extractErrorMessage } from '../api/client';
import AuthShell from '../components/AuthShell';
import Spinner from '../components/Spinner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
      toast.success('Password updated. Redirecting…');
      setTimeout(() => navigate('/login', { replace: true }), 1400);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {!token ? (
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={18} />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Missing reset token
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            This link looks broken. Request a fresh one to continue.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-5 inline-flex">
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Password updated
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Redirecting you to sign in…</p>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Set a new password
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pick something strong. The reset link is single-use.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="new-password">
                New password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input pl-9 pr-10"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors dark:text-slate-500 dark:hover:text-slate-300"
                  tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirm-password">
                Confirm
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input pl-9 pr-10"
                  placeholder="Repeat the password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors dark:text-slate-500 dark:hover:text-slate-300"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
              {submitting ? <Spinner /> : 'Update password'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthShell>
  );
}
