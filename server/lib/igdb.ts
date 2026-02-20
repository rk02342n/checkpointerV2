// Shared IGDB API utilities
// Extracted from seed-game-metadata.ts for reuse across scripts

// --- Types ---

export interface IgdbGameFull {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id: string };
  total_rating?: number;
  total_rating_count?: number;
  updated_at?: number;
  genres?: { id: number; name: string; slug: string }[];
  platforms?: { id: number; name: string; slug: string; abbreviation?: string }[];
  keywords?: { id: number; name: string; slug: string }[];
  screenshots?: { image_id: string; width?: number; height?: number }[];
  artworks?: { image_id: string; width?: number; height?: number }[];
  websites?: { category: number; url: string }[];
}

export type LinkCategory =
  | "official" | "steam" | "gog" | "epic" | "itch"
  | "wikipedia" | "twitter" | "reddit" | "youtube"
  | "twitch" | "discord" | "other";

export type ImageType = "screenshot" | "artwork";

// --- Constants ---

export const IGDB_BATCH_SIZE = 500;
export const IGDB_DELAY_MS = 280; // ~3.5 req/sec, under 4/sec limit
export const DB_INSERT_CHUNK = 500;

export const IGDB_WEBSITE_CATEGORY_MAP: Record<number, LinkCategory> = {
  1: "official",
  2: "other",     // wikia
  3: "wikipedia",
  4: "other",     // facebook
  5: "twitter",
  6: "twitch",
  8: "other",     // instagram
  9: "youtube",
  10: "other",    // iphone
  11: "other",    // ipad
  12: "other",    // android
  13: "steam",
  14: "reddit",
  15: "itch",
  16: "epic",
  17: "gog",
  18: "discord",
};

// --- Auth ---

export async function getIgdbToken(): Promise<string> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get IGDB token: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// --- API fetch with retry ---

export async function fetchIgdb<T>(
  endpoint: string,
  body: string,
  token: string,
  clientId: string,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body,
      });

      if (res.status === 429) {
        // Rate limited — wait and retry
        const waitMs = 1000 * Math.pow(2, attempt);
        console.warn(`  Rate limited, waiting ${waitMs}ms before retry ${attempt}/${maxRetries}...`);
        await delay(waitMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`IGDB API error: ${res.status} ${await res.text()}`);
      }

      return res.json() as Promise<T>;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const waitMs = 1000 * Math.pow(2, attempt);
      console.warn(`  Request failed (attempt ${attempt}/${maxRetries}), retrying in ${waitMs}ms...`, (err as Error).message);
      await delay(waitMs);
    }
  }

  throw new Error("Unreachable");
}

// --- Utility helpers ---

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- URL builders ---

export function igdbCoverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

export function igdbImageUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`;
}
