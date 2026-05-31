import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  History as HistoryIcon,
  Receipt,
} from 'lucide-react';
import { transactionApi, walletApi, extractErrorMessage } from '../api/client';
import type { TransactionView, WalletBalance } from '../types';
import { formatCurrency, relativeTime } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import DailyLimitBar from '../components/DailyLimitBar';
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
        title={email ? `Hi, ${email.split('@')[0]}` : 'Dashboard'}
        subtitle="Snapshot of your wallet and recent activity."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Balance card -- sophisticated dark treatment */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white shadow-soft lg:col-span-2">
          {/* hairline accent on top edge */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {/* subtle radial highlight */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl"
            aria-hidden
          />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Available balance
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                {loading ? (
                  <Spinner size={28} className="text-white" />
                ) : (
                  <span className="tnum text-5xl font-semibold tracking-tightest sm:text-6xl">
                    {wallet ? formatCurrency(wallet.balance) : '—'}
                  </span>
                )}
              </div>
              {wallet && (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Wallet #{wallet.walletId}
                  <span className="text-slate-600">•</span>
                  Active
                </p>
              )}
            </div>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-2.5">
            <Link
              to="/transfer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              <Send size={15} strokeWidth={2} />
              Send money
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              <HistoryIcon size={15} strokeWidth={2} />
              View transactions
            </Link>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <DailyLimitBar />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatCard
              label="Recently received"
              value={receivedTotal}
              tone="positive"
              icon={ArrowDownLeft}
            />
            <StatCard
              label="Recently sent"
              value={sentTotal}
              tone="negative"
              icon={ArrowUpRight}
            />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Last 5 transactions</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={20} className="text-slate-400" />
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
              const isRefund = t.status === 'REFUND';
              const sent = t.direction === 'SENT';
              const counterparty = sent ? t.recipientEmail : t.senderEmail;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50/60"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isRefund
                        ? 'bg-slate-100 text-slate-600'
                        : sent
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {sent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {isRefund ? 'Refund' : sent ? 'Sent to' : 'Received from'}{' '}
                      <span className="text-slate-600">{counterparty}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">
                      {relativeTime(t.createdAt)} · ID #{t.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`tnum text-sm font-semibold ${
                        sent ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {sent ? '−' : '+'}
                      {formatCurrency(t.amount)}
                    </p>
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

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'negative';
  icon: typeof ArrowDownLeft;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon
          size={14}
          strokeWidth={2}
          className={tone === 'positive' ? 'text-emerald-500' : 'text-rose-500'}
        />
      </div>
      <p className="tnum mt-2 text-lg font-semibold tracking-tight text-slate-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
