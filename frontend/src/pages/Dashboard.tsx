import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  History as HistoryIcon,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { transactionApi, walletApi, extractErrorMessage } from '../api/client';
import type { TransactionView, WalletBalance } from '../types';
import { formatCurrency, relativeTime, initialsFromEmail } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { email } = useAuth();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [recent, setRecent] = useState<TransactionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [w, h] = await Promise.all([walletApi.balance(), transactionApi.history(0, 5)]);
        if (alive) {
          setWallet(w);
          setRecent(h.content);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sentTotal = recent
    .filter((t) => t.direction === 'SENT')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const receivedTotal = recent
    .filter((t) => t.direction === 'RECEIVED')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <>
      <PageHeader
        title={`Welcome back${email ? `, ${email.split('@')[0]}` : ''}`}
        subtitle="Here's a snapshot of your wallet."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Balance card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-soft lg:col-span-2">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 right-12 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-wide text-white/70">
              Available balance
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              {loading ? (
                <Spinner size={28} className="text-white" />
              ) : (
                <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {wallet ? formatCurrency(wallet.balance) : '—'}
                </span>
              )}
            </div>
            {wallet && (
              <p className="mt-2 text-sm text-white/70">Wallet #{wallet.walletId}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/transfer"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
              >
                <Send size={16} />
                Send money
              </Link>
              <Link
                to="/history"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <HistoryIcon size={16} />
                View history
              </Link>
            </div>
          </div>
        </div>

        {/* Stats column */}
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Recently received</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft size={18} strokeWidth={2.25} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(receivedTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">From your last 5 transactions</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Recently sent</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpRight size={18} strokeWidth={2.25} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(sentTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">From your last 5 transactions</p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900">Recent activity</h2>
          </div>
          <Link to="/history" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} className="text-brand-600" />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Your transfers will appear here once you send or receive money."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => {
              const sent = t.direction === 'SENT';
              const counterparty = sent ? t.recipientEmail : t.senderEmail;
              return (
                <li key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      sent ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {sent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {sent ? 'Sent to' : 'Received from'} {counterparty}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {relativeTime(t.createdAt)} · ID #{t.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        sent ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {sent ? '−' : '+'}
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.status}</p>
                  </div>
                  <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 sm:flex">
                    {initialsFromEmail(counterparty)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
