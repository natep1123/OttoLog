import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { colors } from './src/theme/tokens';

SplashScreen.preventAutoHideAsync();

type AuthRoute = 'welcome' | 'signIn' | 'signUp';

function RootNavigator() {
  const { session, loading } = useAuth();
  const [authRoute, setAuthRoute] = useState<AuthRoute>('welcome');

  // Reset to welcome when logged out
  useEffect(() => {
    if (!session) setAuthRoute('welcome');
  }, [session]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (session) {
    // Logged in: brand → Home (no-op while Home is the only app screen)
    return <HomeScreen onBrandPress={() => {}} />;
  }

  if (authRoute === 'signIn') {
    return (
      <SignInScreen
        onWelcome={() => setAuthRoute('welcome')}
        onCreateAccount={() => setAuthRoute('signUp')}
      />
    );
  }

  if (authRoute === 'signUp') {
    return (
      <SignUpScreen
        onWelcome={() => setAuthRoute('welcome')}
        onLogIn={() => setAuthRoute('signIn')}
      />
    );
  }

  return (
    <WelcomeScreen
      onLogIn={() => setAuthRoute('signIn')}
      onCreateAccount={() => setAuthRoute('signUp')}
    />
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Fraunces_600SemiBold,
  });

  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
