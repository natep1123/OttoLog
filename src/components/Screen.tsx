import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AmbientBackground } from './AmbientBackground';
import { colors, spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  /** Extra style on the padded content column */
  contentStyle?: ViewStyle;
};

/**
 * Full-screen shell: ambient washes + safe area + content.
 * SafeAreaView from react-native-safe-area-context (not the deprecated RN core one).
 */
export function Screen({ children, contentStyle }: Props) {
  return (
    <View style={styles.root}>
      <AmbientBackground />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    // Between md (16) and lg (24) — wider than original, not edge-tight.
    paddingHorizontal: 20,
    paddingVertical: spacing.xl,
  },
});
