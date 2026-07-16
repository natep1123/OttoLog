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
  onLogIn: () => void;
};

export function SignUpScreen({ onWelcome, onLogIn }: Props) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      username: username.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo('Account created. Confirm your email, then log in.');
    }
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
          <AuthHeader title="Create account" onBrandPress={onWelcome} />

          <View style={styles.form}>
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
            />
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
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <TextField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <Button
              label={submitting ? 'Creating account…' : 'Create account'}
              onPress={onSubmit}
              disabled={submitting}
              style={styles.submit}
            />
            {submitting ? (
              <ActivityIndicator color={colors.sunrise} style={styles.spinner} />
            ) : null}

            <Pressable onPress={onLogIn} hitSlop={8} style={styles.switch}>
              <Text style={styles.switchText}>
                Already have an account?{' '}
                <Text style={styles.switchLink}>Log in</Text>
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
  info: {
    fontFamily: typography.font,
    fontSize: 14,
    color: colors.gold,
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
