// ════════════════════════════════════════════════════════════════════════
// Design System v2 — INGLES
// ════════════════════════════════════════════════════════════════════════
// Paleta: Indigo primario + Terracotta acento cálido + Neutrales fríos.
// Tipografía: SF Pro / system-ui con escala armónica (1.25 ratio).
// Motion: spring-based (react-native-reanimated), 3 tiers.
// Elevación: 4 niveles con sombras nativas.
//
// Roles internos aplicados:
//   Lead Designer   → paleta accesible WCAG AA, escala tipográfica
//   Senior RN Eng.  → tokens consumibles desde StyleSheet + Animated
//   Pedagogía PhD   → colores semánticos por skill (SLA color-coding)
// ════════════════════════════════════════════════════════════════════════

import { useColorScheme, Platform } from 'react-native';

// ─── Color tokens ────────────────────────────────────────────────────

const indigo = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
};

const terracotta = {
  50: '#fef3ee',
  100: '#fde4d4',
  200: '#fac6a8',
  300: '#f6a070',
  400: '#f17137',
  500: '#ee5213',
  600: '#df3809',
  700: '#b9270a',
  800: '#932110',
  900: '#771f10',
};

const neutral = {
  0: '#ffffff',
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

const semantic = {
  success: '#059669',
  successBg: '#d1fae5',
  error: '#dc2626',
  errorBg: '#fee2e2',
  warning: '#d97706',
  warningBg: '#fef3c7',
  info: '#2563eb',
  infoBg: '#dbeafe',
};

// Colores por skill (pedagogía PhD — color-coding por destreza)
export const skillColors = {
  flashcards: indigo[500],
  reading: '#059669',      // green
  listening: '#7c3aed',    // violet
  grammar: '#d97706',      // amber
  writing: terracotta[500],
  speaking: '#db2777',     // pink
  focus: '#0891b2',        // cyan
  coach: indigo[600],
};

// ─── Paletas light / dark ────────────────────────────────────────────

const lightPalette = {
  // Surfaces
  bg: neutral[50],
  bgElevated: neutral[0],
  card: neutral[0],
  cardHover: indigo[50],
  cardBorder: neutral[200],

  // Text
  fg: neutral[900],
  fgSecondary: neutral[600],
  muted: neutral[500],
  placeholder: neutral[400],

  // Brand
  accent: indigo[600],
  accentLight: indigo[100],
  accentSoft: indigo[50],
  accentText: indigo[700],
  warm: terracotta[500],
  warmLight: terracotta[50],

  // Semantic
  good: semantic.success,
  goodBg: semantic.successBg,
  bad: semantic.error,
  badBg: semantic.errorBg,
  warn: semantic.warning,
  warnBg: semantic.warningBg,
  info: semantic.info,
  infoBg: semantic.infoBg,

  // Chrome
  border: neutral[200],
  borderLight: neutral[100],
  separator: neutral[200],
  overlay: 'rgba(15, 23, 42, 0.4)',
  shadow: 'rgba(15, 23, 42, 0.08)',

  // Tab bar
  tabBar: neutral[0],
  tabBarBorder: neutral[200],
  tabInactive: neutral[400],
  tabActive: indigo[600],

  // Inputs
  inputBg: neutral[0],
  inputBorder: neutral[300],
  inputFocus: indigo[500],
};

const darkPalette: typeof lightPalette = {
  bg: neutral[950],
  bgElevated: neutral[900],
  card: neutral[800],
  cardHover: neutral[700],
  cardBorder: neutral[700],

  fg: neutral[50],
  fgSecondary: neutral[300],
  muted: neutral[400],
  placeholder: neutral[500],

  accent: indigo[400],
  accentLight: indigo[900],
  accentSoft: indigo[900] + '88',
  accentText: indigo[300],
  warm: terracotta[400],
  warmLight: terracotta[900] + '44',

  good: '#34d399',
  goodBg: '#064e3b',
  bad: '#f87171',
  badBg: '#450a0a',
  warn: '#fbbf24',
  warnBg: '#451a03',
  info: '#60a5fa',
  infoBg: '#1e3a5f',

  border: neutral[700],
  borderLight: neutral[800],
  separator: neutral[700],
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  tabBar: neutral[900],
  tabBarBorder: neutral[800],
  tabInactive: neutral[500],
  tabActive: indigo[400],

  inputBg: neutral[800],
  inputBorder: neutral[600],
  inputFocus: indigo[400],
};

export type Palette = typeof lightPalette;

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPalette : lightPalette;
}

// ─── Spacing (4px base grid) ─────────────────────────────────────────

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

// ─── Border radius ───────────────────────────────────────────────────

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ─── Typography (1.25 modular scale) ─────────────────────────────────

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  default: 'System',
});

const fontFamilyMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  web: 'ui-monospace, "SF Mono", Menlo, monospace',
  default: 'monospace',
});

export const typography = {
  hero: { fontSize: 34, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.8, fontFamily },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.5, fontFamily },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.3, fontFamily },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.1, fontFamily },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, fontFamily },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, fontFamily },
  small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, fontFamily },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.4, fontFamily },
  mono: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily: fontFamilyMono },
  tabLabel: { fontSize: 10, fontWeight: '600' as const, lineHeight: 12, letterSpacing: 0.2, fontFamily },
} as const;

// ─── Elevation (shadow) ──────────────────────────────────────────────

export const elevation = {
  none: {},
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 8 },
    default: {},
  }),
  xl: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24 },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

// ─── Motion (spring configs for reanimated) ──────────────────────────

export const motion = {
  // Fast micro-interactions (button press, toggle)
  fast: { damping: 20, stiffness: 300, mass: 0.8 },
  // Standard transitions (card expand, page slide)
  standard: { damping: 18, stiffness: 200, mass: 1 },
  // Gentle/slow (page transitions, large surface)
  gentle: { damping: 16, stiffness: 120, mass: 1.2 },
  // Durations for non-spring (opacity, etc.)
  durationFast: 150,
  durationStandard: 250,
  durationSlow: 400,
} as const;

// ─── Layout constants ────────────────────────────────────────────────

export const layout = {
  maxContentWidth: 640,
  tabBarHeight: Platform.select({ ios: 88, default: 64 })!,
  headerHeight: Platform.select({ ios: 96, default: 56 })!,
  cardMinHeight: 72,
  inputHeight: 48,
  buttonHeight: 48,
  chipHeight: 32,
} as const;
