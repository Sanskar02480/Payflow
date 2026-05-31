import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ShieldCheck, RefreshCw, AtSign, IndianRupee, ArrowRight } from 'lucide-react';
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
  // Fallback for very old browsers.
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
      <PageHeader title="Send Money" subtitle="Transfer to another PayFlow user instantly." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <DailyLimitBar compact />
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="recipient">
                Recipient email
              </label>
              <div className="relative">
                <AtSign
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recipient"
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="bob@payflow.dev"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="amount">
                Amount (INR)
              </label>
              <div className="relative">
                <IndianRupee
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="input pl-10"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {wallet && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Available: {formatCurrency(wallet.balance)}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="idem">
                Idempotency key{' '}
                <span className="font-normal text-slate-400">(auto-generated)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="idem"
                  readOnly
                  className="input flex-1 cursor-not-allowed bg-slate-50 font-mono text-xs"
                  value={idempotencyKey}
                />
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(newIdempotencyKey())}
                  className="btn-secondary px-3"
                  aria-label="Regenerate idempotency key"
                  title="Regenerate"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Submitting twice with the same key returns the same response — no double charges.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
                {submitting ? (
                  <Spinner />
                ) : (
                  <>
                    <Send size={16} />
                    Send
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Side info card */}
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck size={18} strokeWidth={2.25} />
              <p className="text-sm font-semibold text-slate-900">Safe by design</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                ACID database transaction — debit & credit in one atomic step.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                Idempotency-Key UUID prevents double-charges on retry.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                Row locks + @Version prevent lost updates under concurrency.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                Rate-limited to 10 transfers/minute.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
