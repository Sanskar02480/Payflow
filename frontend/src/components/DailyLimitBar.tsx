import { useEffect, useState } from 'react';
import { paymentApi } from '../api/client';
import type { DailySpent } from '../types';
import { formatCurrency } from '../lib/format';

interface Props {
  /** When this value changes, the component re-fetches. */
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
      <div className={compact ? 'h-2 w-full animate-pulse rounded-full bg-slate-100' : 'card animate-pulse p-5'}>
        {!compact && <div className="h-14" />}
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
    : 'bg-slate-900';

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            <span className="tnum font-semibold text-slate-700">{formatCurrency(spent)}</span>
            <span className="text-slate-400"> / {formatCurrency(limit)} today</span>
          </span>
          <span className={`tnum ${danger ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
            {formatCurrency(data.remaining)} left
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">Daily limit</p>
        <span className="tnum text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {pct.toFixed(0)}% used
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="tnum text-lg font-semibold tracking-tight text-slate-900">
          {formatCurrency(spent)}
        </p>
        <p className="tnum text-xs text-slate-500">of {formatCurrency(limit)}</p>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="tnum mt-2 text-[11px] text-slate-500">
        {formatCurrency(data.remaining)} remaining · resets 00:00 UTC
      </p>
    </div>
  );
}
