import { useEffect, useState } from 'react';
import { ShieldCheck, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionApi, extractErrorMessage } from '../api/client';
import type { PageResponse, TransactionView } from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate } from '../lib/format';

export default function AdminTransactions() {
  const [page, setPage] = useState(0);
  const [size] = useState(50);
  const [data, setData] = useState<PageResponse<TransactionView> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    transactionApi
      .adminAll(page, size)
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
  }, [page, size]);

  return (
    <>
      <PageHeader
        title="All transactions"
        subtitle="System-wide view across every wallet."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            <ShieldCheck size={12} strokeWidth={2.25} />
            Admin
          </span>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={20} className="text-slate-400" />
          </div>
        ) : !data || data.content.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions in the system yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Sender</th>
                  <th className="px-6 py-3 font-semibold">Recipient</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.content.map((t) => (
                  <tr key={t.id} className="text-sm transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400 dark:text-slate-500">#{t.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{t.senderEmail}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{t.recipientEmail}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-500/20'
                            : t.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-500/20'
                            : t.status === 'REVERSED'
                            ? 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/20'
                            : t.status === 'REFUND'
                            ? 'bg-slate-900 text-white dark:bg-brand-600 dark:text-white'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-500/20'
                        }`}
                      >
                        {t.status}
                      </span>
                      {t.refundOfTransactionId && (
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          refund of #{t.refundOfTransactionId}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{formatDate(t.createdAt)}</td>
                    <td className="tnum px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={data.first}
              className="btn-secondary"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {data.number + 1} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data.last}
              className="btn-secondary"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
