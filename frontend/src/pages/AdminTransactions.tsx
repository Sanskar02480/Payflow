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
        title="Admin · All Transactions"
        subtitle="System-wide view across every wallet."
        action={
          <span className="badge bg-brand-50 text-brand-700">
            <ShieldCheck size={14} />
            ADMIN
          </span>
        }
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} className="text-brand-600" />
          </div>
        ) : !data || data.content.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions in the system yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Sender</th>
                  <th className="px-6 py-3">Recipient</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.content.map((t) => (
                  <tr key={t.id} className="text-sm hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{t.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{t.senderEmail}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{t.recipientEmail}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : t.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={data.first}
              className="btn-secondary"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="text-sm text-slate-500">
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
    </>
  );
}
