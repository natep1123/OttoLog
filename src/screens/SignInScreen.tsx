import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AuthHeader } from '../components/AuthHeader';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { colors, spacing, typography } from '../theme/tokens';

type Props = {
  onWelcome: () => void;
  onCreateAccount: () => void;
};

export function SignInScreen({ onWelcome, onCreateAccount }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <Screen contentStyle={styles.content}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <AuthHeader title="Log in" onBrandPress={onWelcome} />

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={submitting ? 'Logging in…' : 'Log in'}
              onPress={onSubmit}
              disabled={submitting}
              style={styles.submit}
            />
            {submitting ? (
              <ActivityIndicator color={colors.sunrise} style={styles.spinner} />
            ) : null}

            <Pressable onPress={onCreateAccount} hitSlop={8} style={styles.switch}>
              <Text style={styles.switchText}>
                Not a user?{' '}
                <Text style={styles.switchLink}>Create an account</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.sunset,
  },
  submit: {
    marginTop: spacing.sm,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  switch: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchText: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  switchLink: {
    fontFamily: typography.fontMedium,
    color: colors.sunrise,
  },
});
