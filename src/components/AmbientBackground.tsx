import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { ambient, colors } from '../theme/tokens';

/**
 * Warm dusk washes behind content.
 * Web CSS can stack radial-gradients on a fixed div; RN has no multi-layer
 * background shorthand, so we paint ellipses with react-native-svg.
 */
export function AmbientBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {ambient.washes.map((wash, i) => (
            <RadialGradient
              key={`grad-${i}`}
              id={`ambient-${i}`}
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
            >
              <Stop offset="0%" stopColor={wash.color} stopOpacity="1" />
              <Stop offset="55%" stopColor={wash.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {ambient.washes.map((wash, i) => (
          <Ellipse
            key={`ellipse-${i}`}
            cx={width * wash.cxRatio}
            cy={height * wash.cyRatio}
            rx={width * wash.rxRatio}
            ry={height * wash.ryRatio}
            fill={`url(#ambient-${i})`}
          />
        ))}
      </Svg>
    </View>
  );
}
