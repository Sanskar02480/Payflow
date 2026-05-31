import { Wallet } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  const icon = size === 'sm' ? 15 : size === 'lg' ? 22 : 17;
  const text = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-[15px]';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dims} relative flex items-center justify-center rounded-lg bg-slate-900 text-white shadow-inner-light`}
      >
        <Wallet size={icon} strokeWidth={2} />
        {/* tiny brand accent dot */}
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
      </div>
      <span className={`${text} font-semibold tracking-tight text-slate-900`}>PayFlow</span>
    </div>
  );
}
