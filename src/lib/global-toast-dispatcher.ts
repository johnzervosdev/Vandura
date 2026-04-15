type ToastHandler = (message: string) => void;

let handler: ToastHandler | null = null;

let lastMessage = '';
let lastAt = 0;

const DEDUPE_MS = 3000;

/** Called from GlobalToastProvider mount. */
export function setGlobalToastHandler(next: ToastHandler | null) {
  handler = next;
}

/** Invoked from QueryClient default onError (Story 5.1). */
export function emitGlobalToast(message: string) {
  const trimmed = message.trim() || 'Something went wrong. Please try again.';
  const now = Date.now();
  if (trimmed === lastMessage && now - lastAt < DEDUPE_MS) {
    return;
  }
  lastMessage = trimmed;
  lastAt = now;
  handler?.(trimmed);
}
