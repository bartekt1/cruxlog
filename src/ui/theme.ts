import { useColorScheme } from 'react-native';
import { useSettings } from './settingsStore';

// "Przewodnik kredą": paper, ink and one rust accent; at night a deep green instead of black.
// Contrast (WCAG): ink/muted/accent/warn ≥ 4.5:1 on bg and surface; outline ≥ 3:1 (input and control borders);
// onAccent on accent and onBadge on badge ≥ 4.5:1. line and contour are decorative only.
const light = {
  bg: '#f3eee3', surface: '#fbf8f1', ink: '#1e1c18', muted: '#6a6152', line: '#d6ccb8', outline: '#8a7f6c',
  accent: '#9a3f22', onAccent: '#ffffff', soft: '#e9e1d1', warn: '#b3261e', sun: '#b07a12',
  cta: '#9a3f22', onCta: '#ffffff', badge: '#1e1c18', onBadge: '#f3eee3', contour: '#ddd3bf',
};
const dark: typeof light = {
  bg: '#141a16', surface: '#1c241f', ink: '#efe9dc', muted: '#a9a08e', line: '#2e3a32', outline: '#6f7a70',
  accent: '#e8865e', onAccent: '#1a0e08', soft: '#222c25', warn: '#f28b82', sun: '#e9b02f',
  cta: '#e8865e', onCta: '#1a0e08', badge: '#efe9dc', onBadge: '#141a16', contour: '#222c25',
};

export type Theme = typeof light;

/** The paper palette whatever the phone is set to; for pictures sent to other people (share cards). */
export const paperTheme: Theme = light;

export function useIsDark(): boolean {
  const system = useColorScheme();
  const mode = useSettings((s) => s.themeMode);
  return mode === 'system' ? system === 'dark' : mode === 'dark';
}

export function useTheme(): Theme {
  return useIsDark() ? dark : light;
}
