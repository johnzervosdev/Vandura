import { TRPCError } from '@trpc/server';

export const GENERIC_DATA_ERROR_MESSAGE =
  'Something went wrong while saving data. Please try again.';

type FormatterShape = {
  message: string;
  code: number;
  data: {
    code: string;
    httpStatus?: number;
    path?: string;
    zodError?: unknown;
    stack?: string;
    [key: string]: unknown;
  };
};

function looksLikeDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as { name?: string; message?: string; code?: string };
  const name = o.name ?? '';
  const msg = String(o.message ?? '');
  const code = String(o.code ?? '');
  if (name === 'SqliteError' || code.startsWith('SQLITE_')) return true;
  if (msg.includes('SQLITE_')) return true;
  if (name === 'BetterSqlite3Error') return true;
  return false;
}

function isUnsafeClientMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  const lower = m.toLowerCase();
  if (/\s+at\s+[\w.$]+\s*\(/.test(m) || /\s+at\s+[\w./\\]+\:\d+/.test(m)) return true;
  if (lower.includes('.ts:') || lower.includes('.tsx:') || lower.includes('.js:')) return true;
  if (lower.includes('econn') || lower.includes('enotfound') || lower.includes('eaddr')) return true;
  if (/[/\\](src|node_modules)[/\\]/i.test(m)) return true;
  if (m.length > 800) return true;
  return false;
}

/**
 * Production-only: hide DB internals and leaky 500 messages from the serialized error.
 */
export function sanitizeTrpcShapeForClient(shape: FormatterShape, error: unknown): FormatterShape {
  if (process.env.NODE_ENV !== 'production') {
    return shape;
  }

  const code = shape.data?.code;
  const message = shape.message ?? '';

  if (code === 'BAD_REQUEST' && shape.data?.zodError) {
    return shape;
  }

  const cause = error instanceof TRPCError ? error.cause : (error as { cause?: unknown }).cause;
  const dbLike = looksLikeDbError(error) || looksLikeDbError(cause);

  const shouldSanitizeMessage =
    dbLike ||
    (code === 'INTERNAL_SERVER_ERROR' && isUnsafeClientMessage(message));

  if (!shouldSanitizeMessage) {
    return shape;
  }

  const nextData = { ...shape.data };
  delete (nextData as { stack?: unknown }).stack;

  return {
    ...shape,
    message: GENERIC_DATA_ERROR_MESSAGE,
    data: {
      code: nextData.code,
      httpStatus: nextData.httpStatus,
      path: nextData.path,
      zodError: nextData.zodError,
    },
  };
}
