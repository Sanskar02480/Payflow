import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionApi, extractErrorMessage } from '../api/client';
import type { PageResponse, TransactionView } from '../types';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate } from '../lib/format';

type Filter = 'ALL' | 'SENT' | 'RECEIVED';

export default function History() {
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [data, setData] = useState<PageResponse<TransactionView> | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, [page, size]);

  const filtered = data?.content.filter((t) => (filter === 'ALL' ? true : t.direction === filter)) ?? [];

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every transfer you've sent or received." />

      <div className="card overflow-hidden">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4">
          {(['ALL', 'SENT', 'RECEIVED'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'SENT' ? 'Sent' : 'Received'}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-500">
            {data && (
              <>
                Showing page {data.number + 1} of {Math.max(1, data.totalPages)} ·{' '}
                {data.totalElements} total
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size={24} className="text-brand-600" />
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
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">From / To</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const sent = t.direction === 'SENT';
                  return (
                    <tr key={t.id} className="text-sm hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              sent ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {sent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <span className="font-medium text-slate-700">
                            {sent ? 'Sent' : 'Received'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <p className="font-medium">{sent ? t.recipientEmail : t.senderEmail}</p>
                        <p className="text-xs text-slate-500">ID #{t.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(t.createdAt)}</td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          sent ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {sent ? '−' : '+'}
                        {formatCurrency(t.amount)}
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

function StatusBadge({ status }: { status: TransactionView['status'] }) {
  const cls =
    status === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'PENDING'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-rose-50 text-rose-700';
  return <span className={`badge ${cls}`}>{status}</span>;
}
