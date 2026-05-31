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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="card w-full max-w-md animate-slide-up p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                destructive ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? 'btn inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60'
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
