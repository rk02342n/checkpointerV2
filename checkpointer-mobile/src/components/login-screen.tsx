import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKindeAuth } from '@kinde/expo';

import { Btn, ErrorNote, Surface } from '@/components/ui';

const kindeConfigured = Boolean(
  process.env.EXPO_PUBLIC_KINDE_DOMAIN && process.env.EXPO_PUBLIC_KINDE_CLIENT_ID
);

export function LoginScreen() {
  const { login, register } = useKindeAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: typeof login) {
    setError(null);
    setBusy(true);
    try {
      const result = await action({});
      if (!result.success) {
        setError(result.errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
      <View className="w-full max-w-sm">
        <Text className="text-4xl font-bold uppercase tracking-widest text-foreground">
          Checkpointer
        </Text>
        <View className="mt-2 h-2 w-24 bg-pop-300" />

        <Surface className="mt-8 p-6">
          <Text className="text-base text-foreground">
            Track what you play. Rate what you finish.
          </Text>

          {Platform.OS === 'web' && (
            <View className="mt-4">
              <ErrorNote label="Log in doesn’t work in the web preview (secure token storage is native-only). Scan the QR code with your phone and use Expo Go." />
            </View>
          )}

          {!kindeConfigured && (
            <View className="mt-4">
              <ErrorNote label="Missing EXPO_PUBLIC_KINDE_DOMAIN / EXPO_PUBLIC_KINDE_CLIENT_ID — set them in checkpointer-mobile/.env and restart expo." />
            </View>
          )}

          <Btn
            label={busy ? 'Working…' : 'Log in'}
            variant="primary"
            className="mt-6"
            disabled={busy || !kindeConfigured}
            onPress={() => run(login)}
          />
          <Btn
            label="Create account"
            className="mt-3"
            disabled={busy || !kindeConfigured}
            onPress={() => run(register)}
          />

          {error && (
            <View className="mt-4">
              <ErrorNote label={error} />
            </View>
          )}
        </Surface>
      </View>
    </SafeAreaView>
  );
}
