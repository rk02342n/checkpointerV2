import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Btn, ErrorNote, Surface } from '@/components/ui';
import {
  currentSessionQueryOptions,
  useLogPastGame,
  useSetCurrentlyPlaying,
  useStopPlaying,
} from '@/lib/queries/sessions';
import { useToggleWishlist, wishlistCheckQueryOptions } from '@/lib/queries/wishlist';

export function GameActions({ gameId }: { gameId: string }) {
  const current = useQuery(currentSessionQueryOptions);
  const wishlist = useQuery(wishlistCheckQueryOptions(gameId));

  const startPlaying = useSetCurrentlyPlaying();
  const stopPlaying = useStopPlaying();
  const logPast = useLogPastGame();
  const toggleWishlist = useToggleWishlist(gameId);

  const playingThis = current.data?.session?.gameId === gameId;
  const playingOther = !playingThis && current.data?.game != null;
  const busy = startPlaying.isPending || stopPlaying.isPending || logPast.isPending;

  return (
    <Surface className="mt-5 p-4">
      {playingThis ? (
        <>
          <Text className="font-bold text-foreground">You’re playing this now.</Text>
          <View className="mt-1 flex-row flex-wrap">
            <Btn
              label="Finished it"
              variant="primary"
              small
              className="mr-3 mt-3"
              disabled={busy}
              onPress={() => stopPlaying.mutate('finished')}
            />
            <Btn
              label="Stash it"
              small
              className="mr-3 mt-3"
              disabled={busy}
              onPress={() => stopPlaying.mutate('stashed')}
            />
          </View>
        </>
      ) : (
        <>
          {playingOther && (
            <Text className="text-xs text-muted-foreground">
              Starting this ends your session on {current.data?.game?.name}.
            </Text>
          )}
          <View className="flex-row flex-wrap">
            <Btn
              label="▶ Play now"
              variant="primary"
              small
              className="mr-3 mt-3"
              disabled={busy}
              onPress={() => startPlaying.mutate(gameId)}
            />
            <Btn
              label="Log as finished"
              small
              className="mr-3 mt-3"
              disabled={busy}
              onPress={() => logPast.mutate({ gameId, status: 'finished' })}
            />
            <Btn
              label="Log as stashed"
              small
              className="mr-3 mt-3"
              disabled={busy}
              onPress={() => logPast.mutate({ gameId, status: 'stashed' })}
            />
          </View>
        </>
      )}

      <View className="mt-3 flex-row">
        <Btn
          label={wishlist.data?.inWishlist ? '♥ On your wishlist' : '♡ Want to play'}
          small
          disabled={wishlist.isPending || toggleWishlist.isPending}
          onPress={() => toggleWishlist.mutate(wishlist.data?.inWishlist ?? false)}
        />
      </View>

      {(startPlaying.isError ||
        stopPlaying.isError ||
        logPast.isError ||
        toggleWishlist.isError) && (
        <View className="mt-3">
          <ErrorNote label="That didn’t save — try again." />
        </View>
      )}
    </Surface>
  );
}
