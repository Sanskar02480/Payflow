import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, RefreshCw, AtSign, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi, walletApi, extractErrorMessage } from '../api/client';
import { formatCurrency } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import DailyLimitBar from '../components/DailyLimitBar';
import type { WalletBalance } from '../types';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Transfer() {
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    walletApi.balance().then(setWallet).catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Enter a valid amount greater than zero');
      return;
    }
    if (wallet && numericAmount > Number(wallet.balance)) {
      toast.error('Amount exceeds your available balance');
      return;
    }

    setSubmitting(true);
    try {
      const res = await paymentApi.transfer(
        { recipientEmail: recipient.trim(), amount: numericAmount },
        idempotencyKey,
      );
      toast.success(
        res.replayed
          ? `Replayed earlier transfer of ${formatCurrency(res.amount)}`
          : `Sent ${formatCurrency(res.amount)} to ${res.recipientEmail}`,
      );
      navigate('/history');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Send money" subtitle="Transfer to another PayFlow user." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          {/* Current-balance + daily-limit strip */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Available balance
              </p>
              <p className="tnum mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {wallet ? formatCurrency(wallet.balance) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50 px-4 py-3">
              <DailyLimitBar compact />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="recipient">
                Recipient
              </label>
              <div className="relative">
                <AtSign
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recipient"
                  type="email"
                  required
                  className="input pl-9"
                  placeholder="email@payflow.dev"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="amount">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  ₹
                </span>
                <input
                  id="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="input no-spin tnum pl-7 text-base"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="idem">
                Idempotency key
              </label>
              <div className="flex gap-2">
                <input
                  id="idem"
                  readOnly
                  className="input flex-1 cursor-not-allowed bg-slate-50/70 dark:bg-slate-800/70 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300"
                  value={idempotencyKey}
                />
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(newIdempotencyKey())}
                  className="btn-secondary px-2.5"
                  aria-label="Regenerate idempotency key"
                  title="Regenerate"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Submitting twice with the same key returns the same response — no double charge.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-[130px]">
                {submitting ? (
                  <Spinner />
                ) : (
                  <>
                    <Send size={14} strokeWidth={2} />
                    Send
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <aside className="card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">What protects this transfer</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">ACID transaction</span> — debit
                and credit happen as one step or not at all.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">Idempotency key</span> — retries
                return the same response, never re-process.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">Row locks + @Version</span> — no
                lost updates under concurrency.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">Rate limited</span> — 10 transfers
                per minute, ₹50,000 daily cap.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
