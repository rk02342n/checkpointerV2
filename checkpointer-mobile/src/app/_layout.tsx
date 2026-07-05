import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import '../global.css';

import { KindeAuthProvider, useKindeAuth } from '@kinde/expo';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LoginScreen } from '@/components/login-screen';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Login-gated app: no anonymous mode. Until the SDK has restored the session
// from secure storage, keep rendering nothing behind the splash overlay.
function Gate() {
  const { isAuthenticated, isLoading } = useKindeAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <LoginScreen />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.light.background },
        headerTintColor: Colors.light.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game/[id]" options={{ title: 'Game' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <KindeAuthProvider
      config={{
        domain: process.env.EXPO_PUBLIC_KINDE_DOMAIN,
        clientId: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID,
        scopes: 'openid profile email offline',
      }}
      callbacks={{
        onEvent: (event) => {
          // A different account may log in next — drop everything cached.
          if (event === 'logout') {
            queryClient.clear();
          }
        },
      }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Gate />
        </ThemeProvider>
      </QueryClientProvider>
    </KindeAuthProvider>
  );
}
