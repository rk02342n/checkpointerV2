import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameRow } from '@/components/game-row';
import { ChipButton, EmptyNote, LoadingNote } from '@/components/ui';
import { currentSessionQueryOptions, playHistoryQueryOptions } from '@/lib/queries/sessions';
import { accountQueryOptions } from '@/lib/queries/user';
import { wishlistQueryOptions } from '@/lib/queries/wishlist';

const SEGMENTS = ['Playing', 'Finished', 'Stashed', 'Wishlist'] as const;
type Segment = (typeof SEGMENTS)[number];

type Row = {
  key: string;
  gameId: string;
  name: string;
  coverUrl: string | null;
  subtitle: string;
};

export default function LibraryScreen() {
  const [segment, setSegment] = useState<Segment>('Playing');

  const account = useQuery(accountQueryOptions);
  const current = useQuery(currentSessionQueryOptions);
  const history = useQuery({
    ...playHistoryQueryOptions(account.data?.id ?? ''),
    enabled: account.data != null,
  });
  const wishlist = useQuery(wishlistQueryOptions);

  const day = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '');

  let rows: Row[] = [];
  if (segment === 'Playing') {
    rows =
      current.data?.game && current.data.session
        ? [
            {
              key: current.data.session.id,
              gameId: current.data.game.id,
              name: current.data.game.name,
              coverUrl: current.data.game.coverUrl,
              subtitle: `Playing since ${day(current.data.session.startedAt)}`,
            },
          ]
        : [];
  } else if (segment === 'Finished' || segment === 'Stashed') {
    const status = segment === 'Finished' ? 'finished' : 'stashed';
    rows =
      history.data?.sessions
        .filter((s) => s.session.status === status)
        .map((s) => ({
          key: s.session.id,
          gameId: s.game.id,
          name: s.game.name,
          coverUrl: s.game.coverUrl,
          subtitle: day(s.session.endedAt),
        })) ?? [];
  } else {
    rows =
      wishlist.data?.wishlist.map((w) => ({
        key: w.gameId,
        gameId: w.gameId,
        name: w.gameName,
        coverUrl: w.gameCoverUrl,
        subtitle: `Added ${day(w.createdAt)}`,
      })) ?? [];
  }

  const pending =
    segment === 'Playing'
      ? current.isPending
      : segment === 'Wishlist'
        ? wishlist.isPending
        : account.isPending || history.isPending;

  const empty: Record<Segment, string> = {
    Playing: 'Nothing on deck — open a game and hit “Play now”.',
    Finished: 'No finished games yet. Go beat something.',
    Stashed: 'Nothing stashed. Lucky you.',
    Wishlist: 'Your wishlist is empty — search for a game you’re curious about.',
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-3">
        <Text className="text-2xl font-bold uppercase tracking-widest text-foreground">
          Library
        </Text>
        <View className="mt-1 h-1.5 w-16 bg-pop-300" />
      </View>

      <View className="flex-row px-4 pt-5">
        {SEGMENTS.map((s) => (
          <ChipButton
            key={s}
            label={s}
            selected={segment === s}
            className="mr-3"
            onPress={() => setSegment(s)}
          />
        ))}
      </View>

      {pending ? (
        <View className="p-4">
          <LoadingNote />
        </View>
      ) : rows.length === 0 ? (
        <View className="p-4">
          <EmptyNote label={empty[segment]} />
        </View>
      ) : (
        <FlatList
          className="mt-5"
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <GameRow
              gameId={item.gameId}
              name={item.name}
              coverUrl={item.coverUrl}
              subtitle={item.subtitle}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
