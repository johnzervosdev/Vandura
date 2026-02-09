'use client';

import type { ReactNode } from 'react';

export function Modal({
  children,
  onClose,
  closeOnBackdrop = false,
  showCloseButton = false,
  maxWidthClassName = 'max-w-lg',
}: {
  children: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  maxWidthClassName?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={() => {
        if (closeOnBackdrop) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${maxWidthClassName} rounded-lg border bg-card p-6`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showCloseButton ? (
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md border px-2 py-1 text-sm hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        ) : null}

        {children}
      </div>
    </div>
  );
}

