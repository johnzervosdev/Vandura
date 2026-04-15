'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { setGlobalToastHandler } from '@/lib/global-toast-dispatcher';

type ToastItem = { id: string; message: string };

export function GlobalToastProvider({ children }: { children: React.ReactNode }) {
  const reactId = useId();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string) => {
    const id = `${reactId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
  }, [reactId]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    setGlobalToastHandler(pushToast);
    return () => setGlobalToastHandler(null);
  }, [pushToast]);

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md border border-border bg-card p-3 text-sm shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-foreground">{t.message}</div>
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:underline"
                onClick={() => dismiss(t.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
