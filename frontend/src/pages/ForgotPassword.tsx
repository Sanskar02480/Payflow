import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, extractErrorMessage } from '../api/client';
import Logo from '../components/Logo';
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="card p-8">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                If an account exists with <span className="font-semibold">{email}</span>, a
                password reset link has been sent. It's valid for 15 minutes.
              </p>

              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                <div className="flex items-center gap-2 text-amber-700">
                  <Terminal size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Demo mode
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-amber-700">
                  Email delivery isn't wired up. The reset link has been printed in the
                  backend terminal — copy the URL from there to continue.
                </p>
              </div>

              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Forgot your password?
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your email and we'll send you a link to set a new one.
              </p>

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

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <Spinner /> : 'Send reset link'}
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
