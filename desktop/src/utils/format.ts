/**
 * Format Indian number grouping (Lakhs and Crores)
 * e.g. 175000 -> "1,75,000", 10000000 -> "1,00,00,000"
 */
export function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(Math.round(num));
  const s = absNum.toString();

  if (s.length <= 3) {
    return (isNegative ? '-' : '') + s;
  }

  const lastThree = s.substring(s.length - 3);
  const otherNumbers = s.substring(0, s.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return (isNegative ? '-' : '') + formattedOther + ',' + lastThree;
}

/**
 * Format paise to formatted INR string with ₹ symbol
 * @param paise integer amount in paise (100 paise = 1 rupee)
 */
export function formatINR(paise: number = 0): string {
  const rupees = Math.round(paise / 100);
  return `₹${formatIndianNumber(rupees)}`;
}

/**
 * Format paise without symbol
 */
export function formatINRWithoutSymbol(paise: number = 0): string {
  const rupees = Math.round(paise / 100);
  return formatIndianNumber(rupees);
}

/**
 * Convert rupee number or string to paise (integer)
 */
export function rupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees.replace(/,/g, '')) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Convert paise to rupees (integer or decimal)
 */
export function paiseToRupees(paise: number = 0): number {
  return Math.round(paise / 100);
}

/**
 * Format ISO date string into readable text (e.g. "12 Oct 2026")
 */
export function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

/**
 * Format Year-Month (e.g. 2026, 10 -> "October 2026")
 */
export function formatPeriod(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
