import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { hardShadow } from '@/components/ui';

// List row (search results, library): a low Surface with the cover flush
// against the rounded left edge. Shared so the two lists can't drift apart.
export function GameRow({
  gameId,
  name,
  coverUrl,
  subtitle,
}: {
  gameId: string;
  name: string;
  coverUrl: string | null;
  subtitle: string;
}) {
  return (
    <Link href={{ pathname: '/game/[id]', params: { id: gameId } }} asChild>
      <Pressable
        className="mb-4 flex-row overflow-hidden rounded-[10px] bg-card active:opacity-80"
        style={hardShadow(3)}>
        <View className="h-20 w-14 bg-muted">
          {coverUrl && (
            <Image
              source={{ uri: coverUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )}
        </View>
        <View className="flex-1 justify-center px-3">
          <Text className="font-bold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
