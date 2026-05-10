/**
 * Design tokens for Jaquelina López Barber Studio
 * Premium look: dark headers, gold accents, clean white cards
 */

export const colors = {
  // Brand
  black: '#1A1A1A',
  blackPure: '#000000',
  gold: '#C8A84E',
  goldLight: '#E5D5A0',
  goldDark: '#A68A3E',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Semantic
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57F17',
  warningLight: '#FFF8E1',
  error: '#C62828',
  errorLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Status-specific (appointment chips)
  statusPending: '#F57F17',
  statusPendingBg: '#FFF8E1',
  statusConfirmed: '#2E7D32',
  statusConfirmedBg: '#E8F5E9',
  statusCancelled: '#C62828',
  statusCancelledBg: '#FFEBEE',
  statusReschedule: '#1565C0',
  statusRescheduleBg: '#E3F2FD',
  statusCompleted: '#37474F',
  statusCompletedBg: '#ECEFF1',
  statusNoShow: '#6A1B9A',
  statusNoShowBg: '#F3E5F5',
  statusAwaitingClient: '#E65100',
  statusAwaitingClientBg: '#FFF3E0',
  statusRejected: '#B71C1C',
  statusRejectedBg: '#FFCDD2',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const shadows = {
  card: {
    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
    elevation: 3,
  },
  cardHover: {
    boxShadow: '0px 4px 12px rgba(0,0,0,0.12)',
    elevation: 5,
  },
  header: {
    boxShadow: '0px 2px 4px rgba(0,0,0,0.15)',
    elevation: 4,
  },
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  subtitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  buttonSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
  tabLabel: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
} as const;
