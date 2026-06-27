/**
 * Helpers para tratar datas civis (sem hora/fuso) de forma consistente.
 *
 * Bug que motivou estes helpers: usar `Date.toISOString()` / `new Date(isoString)`
 * em datas de roteiro causa deslocamento de um dia em fusos negativos (ex.: GMT-3).
 *
 * Regra: serializar como `YYYY-MM-DD` no fuso local e desserializar
 * construindo `new Date(y, m-1, d)` (também no fuso local).
 */

export function formatLocalDate(date: Date | undefined | null): string {
  if (!date) return '';
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(value: string | Date | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value !== 'string') return undefined;

  // Aceita "YYYY-MM-DD" ou ISO completo "YYYY-MM-DDTHH:mm:ss..."
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
    const result = new Date(y, m - 1, d);
    if (result.getFullYear() !== y || result.getMonth() !== m - 1 || result.getDate() !== d) {
      return undefined;
    }
    return result;
  }

  // Fallback: tenta parse nativo (pode deslocar dia em alguns formatos, mas
  // ao menos não quebra entradas legadas).
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? undefined : fallback;
}
