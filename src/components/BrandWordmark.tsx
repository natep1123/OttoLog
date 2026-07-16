import { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { brandGradient, colors, typography } from '../theme/tokens';

type Props = {
  /** Hero size on welcome; smaller elsewhere later */
  size?: 'hero' | 'header';
  /** Optional tap — e.g. go Welcome (logged out) or Home (logged in) */
  onPress?: () => void;
};

/**
 * Gradient “OttoLog” wordmark (`BrandWordmark`).
 * Web uses background-clip: text; RN Text cannot clip gradients that way,
 * so we fill SVG text with a LinearGradient (same stop colors as `.brand`).
 */
export function BrandWordmark({ size = 'hero', onPress }: Props) {
  const fontSize = size === 'hero' ? 42 : 28;
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const mark = (
    <View style={styles.wrap} onLayout={onLayout}>
      <Text
        style={[
          styles.measure,
          {
            fontFamily: typography.display,
            fontSize,
            letterSpacing: fontSize * -0.02,
          },
        ]}
      >
        OttoLog
      </Text>
      {width > 0 && (
        <Svg
          width={width}
          height={fontSize * 1.25}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient
              id="brand"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="75%"
            >
              <Stop offset="0%" stopColor={brandGradient.colors[0]} />
              <Stop offset="55%" stopColor={brandGradient.colors[1]} />
              <Stop offset="100%" stopColor={brandGradient.colors[2]} />
            </LinearGradient>
          </Defs>
          <SvgText
            fill="url(#brand)"
            fontSize={fontSize}
            fontFamily={typography.display}
            fontWeight="600"
            letterSpacing={fontSize * -0.02}
            x={0}
            y={fontSize}
          >
            OttoLog
          </SvgText>
        </Svg>
      )}
    </View>
  );

  if (!onPress) return mark;

  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      {mark}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  measure: {
    opacity: 0,
    color: colors.text,
  },
});
