import { hc } from "hono/client";
import Constants from "expo-constants";
import { getRawToken } from "@kinde/expo/utils";
import type { ApiRoutes } from "@server/app";

// In Expo Go the dev server host is the machine running `expo start`, which is
// also where the API runs — derive its LAN IP instead of hardcoding one.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (devHost ? `http://${devHost}:3000` : "http://localhost:3000");

// Pull the Kinde access token from the SDK's secure storage on every request;
// KindeAuthProvider keeps it fresh (refresh timer), so no manual wiring.
const client = hc<ApiRoutes>(baseUrl, {
  headers: async (): Promise<Record<string, string>> => {
    const token = await getRawToken("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const api = client.api;
