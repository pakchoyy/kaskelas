import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import type { ApiResponse } from './types.js';

export function sendSuccess<T>(res: VercelResponse, data: T, message?: string): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(200).json(response);
}

export function sendError(res: VercelResponse, error: string, status = 400): void {
  const response: ApiResponse = {
    success: false,
    error,
  };
  res.status(status).json(response);
}

export function sendValidationError(res: VercelResponse, error: string): void {
  sendError(res, error, 400);
}

export function sendNotFound(res: VercelResponse, resource = 'Resource'): void {
  sendError(res, `${resource} not found`, 404);
}

export function sendServerError(res: VercelResponse, error: Error): void {
  console.error('Server error:', error);
  sendError(res, 'Internal server error', 500);
}

export function handleError(res: VercelResponse, error: unknown): void {
  if (error instanceof Error) {
    // Check for specific database errors
    if (error.message.includes('duplicate key')) {
      sendValidationError(res, 'Duplicate entry: record already exists');
    } else if (error.message.includes('foreign key')) {
      sendValidationError(res, 'Invalid reference: related record not found');
    } else if (error.message.includes('violates check constraint')) {
      sendValidationError(res, 'Validation error: ' + extractConstraintMessage(error.message));
    } else {
      sendServerError(res, error);
    }
  } else {
    sendError(res, 'Unknown error occurred', 500);
  }
}

function extractConstraintMessage(message: string): string {
  // Extract constraint name from PostgreSQL error
  const match = message.match(/constraint "([^"]+)"/);
  if (match) {
    const constraint = match[1];
    
    // Map constraint names to user-friendly messages
    if (constraint.includes('nominal_positive')) {
      return 'Nominal must be greater than 0';
    } else if (constraint.includes('amal_jumat_friday')) {
      return 'Amal Jumat can only be paid on Fridays';
    } else if (constraint.includes('paguyuban_period')) {
      return 'Period is required for period-based contributions';
    } else if (constraint.includes('note_not_empty')) {
      return 'Note cannot be empty';
    }
  }
  
  return message;
}

export function createId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

export function isValidDate(dateString: string): boolean {
  return isStrictIsoDate(dateString);
}

export function parseQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parseQueryParamArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function parseQueryParamInt(value: string | string[] | undefined): number | undefined {
  const str = parseQueryParam(value);
  if (!str) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Kunci akses API. Aktif hanya kalau env APP_KEY diisi di Vercel,
 * supaya deploy ini tidak mengunci aplikasi sebelum kuncinya disiapkan.
 * Klien mengirim kunci lewat header `x-app-key`.
 */
export function requireKey(req: VercelRequest, res: VercelResponse): boolean {
  const key = process.env.APP_KEY;
  if (!key) return true;
  const sent = req.headers['x-app-key'];
  if (typeof sent === 'string' && safeEqual(sent, key)) return true;
  sendError(res, 'Kunci akses salah atau belum diisi', 401);
  return false;
}

/** Panggilan cron Vercel membawa `Authorization: Bearer <CRON_SECRET>`. */
export function isCronRequest(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  return !!secret && typeof auth === 'string' && safeEqual(auth, `Bearer ${secret}`);
}

/** Tanggal ketat YYYY-MM-DD yang benar-benar ada (tolak 2026-02-30). */
export function isStrictIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
