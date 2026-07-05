import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameRow } from '@/components/game-row';
import { EmptyNote, ErrorNote } from '@/components/ui';
import { searchGamesQueryOptions } from '@/lib/queries/games';

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function SearchScreen() {
  const [input, setInput] = useState('');
  const q = useDebounced(input, 300);
  const { data, isFetching, isError } = useQuery(searchGamesQueryOptions(q));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="p-4">
        <TextInput
          className="rounded-none border-2 border-border bg-card p-3 text-base text-foreground"
          placeholder="Search games…"
          placeholderTextColor="#78716C"
          autoCorrect={false}
          autoCapitalize="none"
          value={input}
          onChangeText={setInput}
        />
      </View>

      {isError && (
        <View className="px-4">
          <ErrorNote label="Search failed — check your connection and try again." />
        </View>
      )}
      {q.trim().length > 0 && data && data.games.length === 0 && !isFetching && (
        <View className="px-4">
          <EmptyNote label={`No games match “${q}”.`} />
        </View>
      )}

      <FlatList
        data={data?.games ?? []}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 2 }}
        renderItem={({ item }) => (
          <GameRow
            gameId={item.id}
            name={item.name}
            coverUrl={item.coverUrl}
            subtitle={
              (item.releaseDate ? String(new Date(item.releaseDate).getFullYear()) : 'TBA') +
              (item.avgUserRating != null ? `  ·  ★ ${item.avgUserRating}` : '')
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
