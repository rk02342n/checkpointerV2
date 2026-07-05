import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKindeAuth } from '@kinde/expo';

import { GameCard } from '@/components/game-card';
import { Btn, EmptyNote, ErrorNote, LoadingNote, SectionLabel } from '@/components/ui';
import {
  featuredGamesQueryOptions,
  topRatedGamesQueryOptions,
  trendingGamesQueryOptions,
} from '@/lib/queries/games';
import { accountQueryOptions } from '@/lib/queries/user';

function Rail({
  title,
  query,
  emptyLabel,
}: {
  title: string;
  query:
    | typeof trendingGamesQueryOptions
    | typeof topRatedGamesQueryOptions
    | typeof featuredGamesQueryOptions;
  emptyLabel: string;
}) {
  const { data, isPending, isError } = useQuery(query);

  return (
    <View className="mt-8">
      <View className="px-4">
        <SectionLabel>{title}</SectionLabel>
      </View>
      <View className="mt-3">
        {isPending && (
          <View className="px-4">
            <LoadingNote />
          </View>
        )}
        {isError && (
          <View className="px-4">
            <ErrorNote label="Couldn’t load — pull to retry." />
          </View>
        )}
        {data && data.games.length === 0 && (
          <View className="px-4">
            <EmptyNote label={emptyLabel} />
          </View>
        )}
        {data && data.games.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6, paddingRight: 8 }}
            data={data.games}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => <GameCard game={item} />}
          />
        )}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { logout } = useKindeAuth();
  const account = useQuery(accountQueryOptions);
  const trending = useQuery(trendingGamesQueryOptions);
  const topRated = useQuery(topRatedGamesQueryOptions);
  const featured = useQuery(featuredGamesQueryOptions);

  const refetchAll = () => {
    trending.refetch();
    topRated.refetch();
    featured.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAll} />}>
        <View className="flex-row items-end justify-between px-4 pt-3">
          <View>
            <Text className="text-2xl font-bold uppercase tracking-widest text-foreground">
              Checkpointer
            </Text>
            <View className="mt-1 h-1.5 w-16 bg-pop-300" />
            {account.data && (
              <Text className="mt-2 text-sm text-muted-foreground">
                @{account.data.username}
              </Text>
            )}
          </View>
          <Btn label="Log out" small onPress={() => logout({ revokeToken: true })} />
        </View>

        <Rail
          title="Trending"
          query={trendingGamesQueryOptions}
          emptyLabel="Nothing trending this week yet."
        />
        <Rail
          title="Top rated"
          query={topRatedGamesQueryOptions}
          emptyLabel="No rated games yet."
        />
        <Rail
          title="Featured"
          query={featuredGamesQueryOptions}
          emptyLabel="Nothing featured right now."
        />
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
