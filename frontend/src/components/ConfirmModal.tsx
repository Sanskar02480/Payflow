import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Spinner from './Spinner';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="card w-full max-w-md animate-slide-up p-6 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                destructive
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <AlertTriangle size={17} />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? 'inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60'
                : 'btn-primary'
            }
          >
            {loading ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
