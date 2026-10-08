import { useColorScheme } from 'react-native';

const light = { bg: '#eceeea', surface: '#f8f9f6', ink: '#16211e', muted: '#5b6965', line: '#d2d8d2', accent: '#1d6b57', onAccent: '#ffffff', soft: '#dde7e1', warn: '#c4433b', sun: '#e9b02f' };
const dark = { bg: '#0f1715', surface: '#17211e', ink: '#e6ece8', muted: '#92a39c', line: '#2a3833', accent: '#4fb596', onAccent: '#06201a', soft: '#203029', warn: '#ef7a72', sun: '#e9b02f' };

export type Theme = typeof light;
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
