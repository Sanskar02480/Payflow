import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { paymentApi } from '../api/client';
import type { DailySpent } from '../types';
import { formatCurrency } from '../lib/format';

interface Props {
  /** When this value changes, the component re-fetches. Pass a counter that
   *  increments after each transfer to refresh the bar. */
  refreshKey?: number;
  compact?: boolean;
}

export default function DailyLimitBar({ refreshKey = 0, compact = false }: Props) {
  const [data, setData] = useState<DailySpent | null>(null);

  useEffect(() => {
    paymentApi.dailySpent().then(setData).catch(() => setData(null));
  }, [refreshKey]);

  if (!data) {
    return (
      <div className={compact ? 'h-2 w-full animate-pulse rounded-full bg-slate-200' : 'card animate-pulse p-5'}>
        {!compact && <div className="h-16" />}
      </div>
    );
  }

  const spent = Number(data.spentToday);
  const limit = Number(data.dailyLimit);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70 && pct < 90;

  const barColor = danger
    ? 'bg-rose-500'
    : warn
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Today: <span className="font-semibold text-slate-700">{formatCurrency(spent)}</span> of{' '}
            {formatCurrency(limit)}
          </span>
          <span className={danger ? 'font-semibold text-rose-600' : 'text-slate-500'}>
            {formatCurrency(data.remaining)} left
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Gauge size={18} strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Daily transfer limit</p>
            <p className="text-xs text-slate-400">Resets at 00:00 UTC</p>
          </div>
        </div>
        <span
          className={`badge ${
            danger ? 'bg-rose-50 text-rose-700' : warn ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {pct.toFixed(0)}% used
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(spent)}
          </span>
          <span className="text-sm text-slate-500">of {formatCurrency(limit)}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {formatCurrency(data.remaining)} remaining today
        </p>
      </div>
    </div>
  );
}
