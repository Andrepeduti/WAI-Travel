export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'BRL', label: 'Real brasileiro', symbol: 'R$' },
  { code: 'USD', label: 'Dólar americano', symbol: 'US$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'Libra Esterlina', symbol: '£' },
  { code: 'JPY', label: 'Iene japonês', symbol: '¥' },
  { code: 'CHF', label: 'Franco suíço', symbol: 'CHF' },
  { code: 'AUD', label: 'Dólar australiano', symbol: 'A$' },
  { code: 'CAD', label: 'Dólar canadense', symbol: 'C$' },
  { code: 'ARS', label: 'Peso argentino', symbol: '$' },
  { code: 'CLP', label: 'Peso chileno', symbol: '$' },
  { code: 'MXN', label: 'Peso mexicano', symbol: '$' },
];

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return currency ? currency.symbol : 'R$';
}

export function formatCurrency(value: number, currencyCode: string = 'BRL'): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  const formattedNumber = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formattedNumber}`;
}
