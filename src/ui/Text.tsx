import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { familyFor } from './fonts';

/**
 * Text in the app's fonts: Barlow by default, the matching weight family for fontWeight,
 * or the family set in the style (e.g. F.display for headings).
 */
export function Text(props: TextProps) {
  const flat = StyleSheet.flatten(props.style) ?? {};
  const fontFamily = flat.fontFamily ?? familyFor(flat.fontWeight);
  return <RNText {...props} style={[props.style, { fontFamily, fontWeight: 'normal' }]} />;
}

