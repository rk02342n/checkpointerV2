import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GameActions } from '@/components/game-actions';
import { ReviewComposer } from '@/components/review-composer';
import {
  EmptyNote,
  ErrorNote,
  LoadingNote,
  SectionLabel,
  Surface,
  Tag,
  hardShadow,
} from '@/components/ui';
import { gameQueryOptions } from '@/lib/queries/games';
import { gameReviewsQueryOptions, useToggleReviewLike } from '@/lib/queries/reviews';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useQuery(gameQueryOptions(id));
  const reviews = useQuery(gameReviewsQueryOptions(id));
  const toggleLike = useToggleReviewLike(id);

  return (
    <>
      <Stack.Screen options={{ title: game.data?.game.name ?? 'Game' }} />
      <ScrollView className="flex-1 bg-background">
        {game.isPending && (
          <View className="p-4">
            <LoadingNote />
          </View>
        )}
        {game.isError && (
          <View className="p-4">
            <ErrorNote label="Couldn’t load this game — go back and try again." />
          </View>
        )}

        {game.data && (
          <View className="p-4">
            <View className="flex-row">
              <View
                className="h-44 w-32 overflow-hidden rounded-[10px] bg-muted"
                style={hardShadow(4)}>
                {game.data.game.coverUrl && (
                  <Image
                    source={{ uri: game.data.game.coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={150}
                  />
                )}
              </View>
              <View className="ml-5 flex-1">
                <Text className="text-xl font-bold text-foreground">
                  {game.data.game.name}
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  {game.data.game.releaseDate
                    ? new Date(game.data.game.releaseDate).getFullYear()
                    : 'TBA'}
                </Text>
                <View className="mt-3">
                  {game.data.game.avgUserRating != null ? (
                    <Text className="text-lg font-bold text-foreground">
                      ★ {game.data.game.avgUserRating}{' '}
                      <Text className="text-sm font-normal text-muted-foreground">
                        ({game.data.game.userReviewCount}{' '}
                        {game.data.game.userReviewCount === 1 ? 'review' : 'reviews'})
                      </Text>
                    </Text>
                  ) : (
                    <EmptyNote label="No reviews yet" />
                  )}
                  {game.data.game.igdbRating != null &&
                    parseFloat(game.data.game.igdbRating) > 0 && (
                      <Text className="mt-1 text-xs text-muted-foreground">
                        IGDB {Math.round(parseFloat(game.data.game.igdbRating))}/100
                      </Text>
                    )}
                </View>
              </View>
            </View>

            <GameActions gameId={id} />

            {game.data.genres.length > 0 && (
              <View className="mt-5 flex-row flex-wrap">
                {game.data.genres.map((g) => (
                  <Tag key={g.id} label={g.name} />
                ))}
              </View>
            )}

            {game.data.platforms.length > 0 && (
              <Text className="mt-1 text-xs text-muted-foreground">
                {game.data.platforms.map((p) => p.abbreviation ?? p.name).join(' · ')}
              </Text>
            )}

            {game.data.game.summary && (
              <Surface className="mt-5 p-4">
                <Text className="text-sm leading-5 text-foreground">
                  {game.data.game.summary}
                </Text>
              </Surface>
            )}

            <View className="mt-8">
              <SectionLabel>Reviews</SectionLabel>
            </View>
            <ReviewComposer gameId={id} />
            {reviews.isPending && (
              <View className="mt-3">
                <LoadingNote />
              </View>
            )}
            {reviews.isError && (
              <View className="mt-3">
                <ErrorNote label="Couldn’t load reviews." />
              </View>
            )}
            {reviews.data && reviews.data.length === 0 && (
              <View className="mt-3">
                <EmptyNote label="No reviews yet — yours can be the first." />
              </View>
            )}
            {reviews.data?.map((review) => (
              <Surface key={review.id} className="mt-4 p-4">
                <View className="flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-muted">
                    {review.avatarUrl ? (
                      <Image
                        source={{ uri: review.avatarUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text className="text-xs font-bold text-foreground">
                        {(review.username ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                      {review.displayName ?? review.username ?? 'Unknown'}
                    </Text>
                    {review.rating != null && (
                      <Text className="text-xs font-bold text-foreground">
                        ★ {review.rating}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    className={`rounded-none px-2.5 py-1 ${
                      review.userLiked ? 'bg-pop-300' : 'bg-card'
                    }`}
                    style={hardShadow(2)}
                    onPress={() => toggleLike.mutate(review.id)}>
                    <Text className="text-xs font-bold text-foreground">
                      {review.userLiked ? '♥' : '♡'} {review.likeCount}
                    </Text>
                  </Pressable>
                </View>
                {review.reviewText && (
                  <Text className="mt-3 text-sm leading-5 text-foreground">
                    {review.reviewText}
                  </Text>
                )}
              </Surface>
            ))}
            <View className="h-10" />
          </View>
        )}
      </ScrollView>
    </>
  );
}
