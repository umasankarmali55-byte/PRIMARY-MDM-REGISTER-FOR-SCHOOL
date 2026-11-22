import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  tone?: 'info' | 'success';
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, tone = 'success', onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md noprint">
      <div className="flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 shadow-lg border border-slate-800 dark:border-slate-200">
        {tone === 'success' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-700" />
        ) : (
          <Info className="h-4 w-4 shrink-0 text-amber-400 dark:text-amber-700" />
        )}
        <p className="text-sm font-medium leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
