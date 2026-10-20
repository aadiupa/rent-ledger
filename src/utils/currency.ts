// ============================================================
// RentLedger — Currency and Date Utilities
// INR formatting, Indian date display, paise <-> rupee conversion
// ============================================================

// ---- Currency --------------------------------------------------

/**
 * Format a number using Indian grouping (2,2,3 from right).
 * e.g. 215500 → "2,15,500"
 */
function indianGrouping(n: number): string {
  // Handle fractional part
  const fixed = n % 1 !== 0 ? n.toFixed(2) : String(Math.round(n));
  const [intPart, decPart] = fixed.split('.');
  // Indian grouping: last 3 digits, then groups of 2
  const intStr = intPart.replace('-', '');
  let result = '';
  if (intStr.length <= 3) {
    result = intStr;
  } else {
    const last3 = intStr.slice(-3);
    const rest = intStr.slice(0, intStr.length - 3);
    const groups = rest.match(/.{1,2}/g) ?? [];
    result = groups.join(',') + ',' + last3;
  }
  const sign = n < 0 ? '-' : '';
  return sign + result + (decPart ? '.' + decPart : '');
}

/**
 * Format paise as Indian rupee string with ₹ symbol and Indian number grouping.
 * e.g. 21550000 paise → "₹2,15,500"
 * Uses manual Indian grouping to avoid Hermes/iOS Intl.NumberFormat issues.
 */
export function formatCurrency(paise: number): string {
  if (paise == null || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return '₹' + indianGrouping(rupees);
}

/**
 * Format paise as plain number string with Indian grouping (no symbol).
 * e.g. 21550000 → "2,15,500"
 */
export function formatAmount(paise: number): string {
  if (paise == null || isNaN(paise)) return '0';
  const rupees = paise / 100;
  return indianGrouping(rupees);
}

/**
 * Convert rupees string/number to paise integer.
 * e.g. "17500" → 1750000
 */
export function rupeesToPaise(rupees: string | number): number {
  const r = typeof rupees === 'string' ? parseFloat(rupees.replace(/,/g, '')) : rupees;
  if (isNaN(r)) return 0;
  return Math.round(r * 100);
}

/**
 * Convert paise to rupees number.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parse a currency input string (e.g., "1,00,000" or "100000") to paise.
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
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

/**
 * Format ISO date string to Indian display format.
 * e.g. "2026-10-15" → "15 Oct 2026"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

/**
 * Format ISO date string to long Indian display format.
 * e.g. "2026-10-15" → "15 October 2026"
 */
export function formatDateLong(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Get month name.
 * e.g. 10 → "October"
 */
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
 * Format a period (year + month) as a readable string.
 * e.g. (2026, 10) → "October 2026"
 */
export function formatPeriod(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/**
 * Parse ISO date to { year, month, day }.
 */
export function parseISODate(isoDate: string): { year: number; month: number; day: number } {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Get ISO date for the last day of a month.
 */
export function getMonthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Compare two ISO date strings.
 */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if an ISO date is today or in the past.
 */
export function isDateDue(isoDate: string): boolean {
  return isoDate <= getTodayISO();
}

/**
 * Check if an ISO date is in the future.
 */
export function isDateFuture(isoDate: string): boolean {
  return isoDate > getTodayISO();
}
