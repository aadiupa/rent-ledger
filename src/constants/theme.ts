// ============================================================
// RentLedger — Design Tokens & Theme
// ============================================================

export const Colors = {
  // Brand
  primary: '#1565C0',       // Deep blue — primary actions
  primaryLight: '#1E88E5',
  primaryDark: '#0D47A1',
  accent: '#00897B',        // Teal — positive/income
  danger: '#C62828',        // Red — expenses/overdue
  warning: '#F57F17',       // Amber — partially paid / warning
  success: '#2E7D32',       // Green — paid / success
  info: '#0277BD',          // Blue — info

  // Neutrals
  background: '#F5F5F7',    // iOS-like off-white
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#5F6368',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',
  textLink: '#1565C0',

  // Income / Expense
  income: '#2E7D32',
  expense: '#C62828',
  deposit: '#6A1B9A',

  // Status
  overdue: '#C62828',
  partiallyPaid: '#F57F17',
  paid: '#2E7D32',
  upcoming: '#1565C0',
  due: '#F57F17',

  // Chart colors
  chart: ['#1565C0', '#00897B', '#F57F17', '#C62828', '#6A1B9A', '#0277BD'],
};

export const Typography = {
  // Font families (system fonts — no external font needed)
  fontRegular: 'System',
  fontMedium: 'System',
  fontSemiBold: 'System',
  fontBold: 'System',

  // Scale
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
};
