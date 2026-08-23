/**
 * Type-safe normalization helpers.
 *
 * These exist because database documents (Mongoose lean docs) return real
 * JavaScript types (Date objects, numbers, null) while most template and
 * formatting code historically assumed strings — producing crashes such as
 * `(str || "").replace is not a function` when a truthy non-string was passed.
 */

/**
 * Convert any value to a display-safe string WITHOUT stringifying complex
 * objects (which would produce "[object Object]" leaks in emails/PDFs).
 * - string           -> as-is
 * - Date             -> ISO string
 * - number / boolean -> String(value)
 * - null/undefined   -> ""
 * - anything else    -> "" (callers should pick the correct property instead)
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return String(value);
  return '';
}

/** True only for http(s) URLs a browser can open. */
export function isValidHttpUrl(value: unknown): boolean {
  const raw = safeString(value).trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
