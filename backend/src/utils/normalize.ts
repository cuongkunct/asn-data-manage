/**
 * Normalization helpers to ensure:
 * 1. Whitespace trimming
 * 2. Uppercase storage for key identifiers (Tên tài khoản, Tên/mã khách hàng, Hệ thống, NCC, ...)
 * 3. Case-insensitive search, lookup, and duplicate detection
 */

export function normalizeUpper(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toUpperCase();
}

export function normalizeUpperOrNull(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toUpperCase();
  return s.length > 0 ? s : null;
}

export function normalizeTrim(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function escapeRegex(text: string): string {
  return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function caseInsensitiveExact(val: string) {
  return { $regex: new RegExp(`^${escapeRegex(val.trim())}$`, 'i') };
}

export function caseInsensitiveContains(val: string) {
  return { $regex: new RegExp(escapeRegex(val.trim()), 'i') };
}

export function normalizeCustomerLevel(val: any): string {
  if (val === null || val === undefined) return '1';
  const s = String(val).trim();
  if (!s) return '1';
  const match = s.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  return s;
}
