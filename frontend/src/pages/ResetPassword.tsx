import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, extractErrorMessage } from '../api/client';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      toast.success('Password updated! You can now sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
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
          {!token ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Missing reset token
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                This link looks broken. Request a new reset link to continue.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-6">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-slate-500">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Set a new password
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Choose a strong password. The reset link is single-use.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="label" htmlFor="new-password">
                    New password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="input pl-10"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="input pl-10"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <Spinner /> : 'Reset password'}
                </button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
