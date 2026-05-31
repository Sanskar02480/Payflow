import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, extractErrorMessage } from '../api/client';
import AuthShell from '../components/AuthShell';
import Spinner from '../components/Spinner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {submitted ? (
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Check your inbox
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            If an account exists with <span className="font-medium text-slate-700">{email}</span>,
            a reset link has been sent. It expires in 15 minutes.
          </p>

          <div className="mt-5 rounded-md border border-amber-200/70 bg-amber-50/70 p-3.5 text-left">
            <div className="flex items-center gap-1.5 text-amber-800">
              <Terminal size={13} />
              <p className="text-[10px] font-semibold uppercase tracking-wider">Demo mode</p>
            </div>
            <p className="mt-1 text-xs text-amber-800/90">
              Email delivery isn't wired up. The reset link was printed in the backend terminal —
              copy the URL from there to continue.
            </p>
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={13} />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Reset password
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we'll send a link to set a new one.
            </p>
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

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
              {submitting ? <Spinner /> : 'Send reset link'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
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
