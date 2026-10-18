// Barlow for text, Barlow Condensed for headings, grades and numbers. Bundled with the app (works offline).
// Android ignores fontWeight with custom fonts, so each weight is its own family; Text (src/ui/Text.tsx) picks it.
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';

export const FONT_ASSETS = {
  Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold,
};

export const F = {
  body: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semi: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  /** Condensed, for grades, numbers and small headings. */
  cond: 'BarlowCondensed_700Bold',
  /** Condensed extra bold, for screen titles and big numbers. */
  display: 'BarlowCondensed_800ExtraBold',
} as const;

/** Body family for a fontWeight. */
export function familyFor(weight: string | number | undefined): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : weight);
  return w >= 700 ? F.bold : w >= 600 ? F.semi : w >= 500 ? F.medium : F.body;
}
