import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Undo2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi, transactionApi, extractErrorMessage } from '../api/client';
import type { PageResponse, TransactionView } from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency, formatDate } from '../lib/format';

type Filter = 'ALL' | 'SENT' | 'RECEIVED';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function History() {
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [data, setData] = useState<PageResponse<TransactionView> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState<TransactionView | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    transactionApi
      .history(page, size)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, size, reloadCounter]);

  const filtered =
    data?.content.filter((t) => (filter === 'ALL' ? true : t.direction === filter)) ?? [];

  const onConfirmRefund = async () => {
    if (!refundTarget) return;
    setRefundLoading(true);
    try {
      const res = await paymentApi.refund(refundTarget.id, newIdempotencyKey());
      toast.success(
        res.replayed
          ? `Replayed earlier refund of ${formatCurrency(res.amount)}`
          : `Refunded ${formatCurrency(res.amount)} to ${res.originalSenderEmail}`,
      );
      setRefundTarget(null);
      setReloadCounter((n) => n + 1);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every transfer you've sent or received." />

      <div className="card overflow-hidden">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          {(['ALL', 'SENT', 'RECEIVED'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'SENT' ? 'Sent' : 'Received'}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {data && (
                <>
                  Showing page {data.number + 1} of {Math.max(1, data.totalPages)} ·{' '}
                  {data.totalElements} total
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setReloadCounter((n) => n + 1)}
              disabled={loading}
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
              title="Refresh transactions"
              aria-label="Refresh transactions"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={20} className="text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description="When you send or receive money, the records will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">From / To</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Amount</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((t) => {
                  const sent = t.direction === 'SENT';
                  const isRefund = t.status === 'REFUND';
                  const isReversed = t.status === 'REVERSED';
                  return (
                    <tr key={t.id} className="text-sm transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              isRefund
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : sent
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                            }`}
                          >
                            {isRefund ? (
                              <Undo2 size={14} />
                            ) : sent ? (
                              <ArrowUpRight size={14} />
                            ) : (
                              <ArrowDownLeft size={14} />
                            )}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {isRefund ? 'Refund' : sent ? 'Sent' : 'Received'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                        <p className="font-medium">
                          {sent ? t.recipientEmail : t.senderEmail}
                        </p>
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          ID #{t.id}
                          {t.refundOfTransactionId
                            ? ` · refund of #${t.refundOfTransactionId}`
                            : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{formatDate(t.createdAt)}</td>
                      <td
                        className={`tnum px-6 py-4 text-right font-semibold ${
                          isReversed
                            ? 'text-slate-400 line-through'
                            : sent
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {sent ? '−' : '+'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.refundable ? (
                          <button
                            onClick={() => setRefundTarget(t)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
                          >
                            <Undo2 size={12} />
                            Refund
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={data.first}
              className="btn-secondary"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {data.number + 1} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data.last}
              className="btn-secondary"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={refundTarget !== null}
        title="Refund this transfer?"
        message={
          refundTarget
            ? `This will return ${formatCurrency(refundTarget.amount)} to ${refundTarget.senderEmail} (the original sender). Your balance will decrease by this amount. The original transaction will be marked REVERSED, and a new REFUND record will be added to both histories.`
            : ''
        }
        confirmLabel="Yes, refund"
        cancelLabel="Cancel"
        destructive
        loading={refundLoading}
        onConfirm={onConfirmRefund}
        onCancel={() => !refundLoading && setRefundTarget(null)}
      />
    </>
  );
}

function StatusBadge({ status }: { status: TransactionView['status'] }) {
  const map: Record<TransactionView['status'], string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-500/20',
    PENDING:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-500/20',
    FAILED:    'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-500/20',
    REVERSED:  'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/20',
    REFUND:    'bg-slate-900 text-white dark:bg-brand-600 dark:text-white',
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}
