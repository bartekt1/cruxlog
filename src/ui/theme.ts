import { useColorScheme } from 'react-native';

// Contrast (WCAG): ink/muted/accent/warn ≥ 4.5:1 on bg and surface; outline ≥ 3:1 (input and control borders).
// line is only for decorative dividers. cta (the main "add" button) is the only orange, so it stands out from the green UI;
// onCta on cta ≥ 6.5:1.
const light = { bg: '#eceeea', surface: '#f8f9f6', ink: '#16211e', muted: '#5b6965', line: '#d2d8d2', outline: '#7a8782', accent: '#1d6b57', onAccent: '#ffffff', soft: '#dde7e1', warn: '#b33a32', sun: '#e9b02f', cta: '#e8811a', onCta: '#1f1300' };
const dark = { bg: '#0f1715', surface: '#17211e', ink: '#e6ece8', muted: '#92a39c', line: '#2a3833', outline: '#647770', accent: '#4fb596', onAccent: '#06201a', soft: '#203029', warn: '#ef7a72', sun: '#e9b02f', cta: '#f28c28', onCta: '#1f1300' };

export type Theme = typeof light;
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
