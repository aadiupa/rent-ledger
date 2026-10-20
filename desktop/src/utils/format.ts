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

export const formatCurrency = formatINR;

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
  const val = typeof rupees === 'string' ? parseFloat(rupees.replace(/[₹,\s]/g, '')) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

export const parseCurrencyInput = rupeesToPaise;

/**
 * Convert paise to rupees (integer or decimal)
 */
export function paiseToRupees(paise: number = 0): number {
  return Math.round(paise / 100);
}

// ---- Dates -----------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getMonthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

export function getShortMonthName(month: number): string {
  return SHORT_MONTHS[month - 1] ?? '';
}

/**
 * Return today's date in IST as ISO string.
 */
export function getTodayISO(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Return current year and month in IST.
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return { year: ist.getFullYear(), month: ist.getMonth() + 1 };
}

/**
 * Return number of days in a given month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get ISO date for the last day of a month.
 */
export function getMonthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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
