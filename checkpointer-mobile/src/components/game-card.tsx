import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { hardShadow } from '@/components/ui';

type RailGame = {
  id: string;
  name: string;
  coverUrl: string | null;
  avgUserRating?: string | null;
};

// 3:4 cover card for horizontal rails — a small Surface with the cover
// bleeding to the rounded edge.
export function GameCard({ game }: { game: RailGame }) {
  return (
    <Link href={{ pathname: '/game/[id]', params: { id: game.id } }} asChild>
      <Pressable className="mr-4 w-28 active:opacity-70">
        <View
          className="h-36 w-28 overflow-hidden rounded-[10px] bg-muted"
          style={hardShadow(4)}>
          {game.coverUrl ? (
            <Image
              source={{ uri: game.coverUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-3xl font-bold text-muted-foreground">
                {game.name.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-2 text-xs font-bold text-foreground" numberOfLines={2}>
          {game.name}
        </Text>
        {game.avgUserRating != null && (
          <Text className="text-xs text-muted-foreground">★ {game.avgUserRating}</Text>
        )}
      </Pressable>
    </Link>
  );
}
