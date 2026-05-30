import { Wallet } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const icon = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;
  const text = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dims} flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm`}
      >
        <Wallet size={icon} strokeWidth={2.25} />
      </div>
      <span className={`${text} font-bold tracking-tight text-slate-900`}>PayFlow</span>
    </div>
  );
}
