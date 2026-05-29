// Tokens de diseño. La app respeta el modo claro/oscuro del sistema.
import { useColorScheme } from 'react-native';

const lightPalette = {
  bg: '#fafaf7',
  card: '#ffffff',
  fg: '#1a1a1a',
  muted: '#666666',
  border: '#e1e1de',
  accent: '#2d6cdf',
  accentSoft: '#e3edff',
  good: '#2d7a3f',
  bad: '#b73225',
  warn: '#b87a1a',
};

const darkPalette = {
  bg: '#14171a',
  card: '#1d2125',
  fg: '#ebe9e5',
  muted: '#9a948c',
  border: '#2a2e33',
  accent: '#5b8def',
  accentSoft: '#1d2a44',
  good: '#5fbe75',
  bad: '#e15a4c',
  warn: '#e1a04c',
};

export type Palette = typeof lightPalette;

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPalette : lightPalette;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, letterSpacing: 0.4 },
};
