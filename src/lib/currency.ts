/**
 * Helper utilities for currency symbol detection, numeric price extraction,
 * and live formatted numeric inputs.
 */

/**
 * Detects the appropriate currency symbol (e.g., "R$", "€", "£", "$", etc.)
 * based on an input string, an explicit currency code, or a destination list.
 *
 * If a string contains multiple symbols like "R$ £33", non-BRL currency symbols
 * take precedence to clean legacy/corrupted data.
 */
export function detectCurrencySymbol(
  priceStr?: string,
  currencyCode?: string,
  destinations?: string[]
): string {
  // 1. Explicit currency code configured for the itinerary (highest priority)
  if (currencyCode) {
    const code = String(currencyCode).toUpperCase();
    if (code === 'EUR' || code === '€') return '€';
    if (code === 'GBP' || code === '£') return '£';
    if (code === 'USD' || code === '$' || code === 'US$') return 'US$';
    if (code === 'BRL' || code === 'R$') return 'R$';
    if (code === 'ARS' || code === 'ARS$') return 'ARS$';
    if (code === 'CLP' || code === 'CLP$') return 'CLP$';
    if (code === 'JPY' || code === '¥') return '¥';
    if (code === 'CZK' || code === 'KČ') return 'Kč';
    if (code === 'HUF' || code === 'FT') return 'Ft';
    if (code === 'PLN' || code === 'ZŁ') return 'zł';
  }

  // 2. Explicit symbol inside priceStr (fallback if no currencyCode set)
  if (priceStr) {
    const str = String(priceStr);
    // Check specific foreign currency symbols first (to handle legacy "R$ £33" / "R$ €20" corrupt strings)
    if (str.includes('US$')) return 'US$';
    if (str.includes('ARS$')) return 'ARS$';
    if (str.includes('CLP$')) return 'CLP$';
    if (str.includes('€')) return '€';
    if (str.includes('£')) return '£';
    if (str.includes('Kč')) return 'Kč';
    if (str.includes('Ft')) return 'Ft';
    if (str.includes('zł')) return 'zł';
    if (str.includes('¥')) return '¥';
    if (str.includes('$')) return '$';
    if (str.includes('R$')) return 'R$';
  }

  if (destinations && destinations.length > 0) {
    const destsStr = destinations.join(' ').toLowerCase();
    if (/paris|frança|france|roma|rome|itália|italy|barcelona|madrid|espanha|spain|lisboa|lisbon|portugal|amsterdã|amsterdam|holanda|netherlands|berlim|berlin|alemanha|germany|atenas|greece|grécia|viena|vienna|austria|áustria|dublin|irlanda|ireland/.test(destsStr)) {
      return '€';
    }
    if (/londres|london|reino unido|uk|united kingdom|edimburgo|edinburgh|escócia|scotland|inglaterra|england/.test(destsStr)) {
      return '£';
    }
    if (/nova york|new york|nyc|orlando|miami|los angeles|eua|usa|united states|estados unidos/.test(destsStr)) {
      return '$';
    }
    if (/praga|prague|tcheca|czech/.test(destsStr)) {
      return 'Kč';
    }
    if (/budapeste|budapest|húngria|hungary/.test(destsStr)) {
      return 'Ft';
    }
    if (/tóquio|tokyo|japão|japan|kyoto|osaka/.test(destsStr)) {
      return '¥';
    }
  }

  return 'R$';
}

/**
 * Extracts and formats only the numeric component of a price string (e.g. "33,00" or "17,50"),
 * stripping any currency symbols, letters, or extra text (like "(estimado)").
 */
export function extractNumericPrice(priceStr?: string): string {
  if (!priceStr) return '';
  const str = String(priceStr).trim();
  const cleaned = str.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return '';

  let val = 0;
  if (cleaned.includes(',')) {
    val = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      val = parseFloat(cleaned);
    } else {
      val = parseFloat(cleaned.replace(/\./g, ''));
    }
  } else {
    val = parseInt(cleaned, 10);
  }

  if (isNaN(val) || val <= 0) return '';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats live input typed by user into a cents-based numeric string (pt-BR format, e.g. "33,00").
 * Accepts ONLY digits.
 */
export function formatNumericInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  const n = parseInt(digits, 10) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
