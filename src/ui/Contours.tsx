import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

/** Faint contour lines, like on a topo map, behind a screen header. Decorative only. */
export function Contours({ height = 180, color }: { height?: number; color?: string }) {
  const t = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height} viewBox="0 0 390 180" preserveAspectRatio="xMidYMin slice" fill="none" stroke={color ?? t.contour} strokeWidth={1.3}>
        <Path d="M-10 150 C60 120 110 160 180 130 S300 90 400 120" />
        <Path d="M-10 120 C70 90 120 130 190 100 S310 60 400 90" />
        <Path d="M-10 90 C80 60 130 100 200 70 S320 30 400 60" />
        <Path d="M-10 60 C90 30 140 70 210 40 S330 0 400 30" />
        <Path d="M260 160 c20 -30 70 -30 90 0 c-20 18 -70 18 -90 0z" />
        <Path d="M282 158 c10 -14 36 -14 46 0 c-10 8 -36 8 -46 0z" />
      </Svg>
    </View>
  );
}
