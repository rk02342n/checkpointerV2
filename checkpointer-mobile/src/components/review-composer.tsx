import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Btn, ChipButton, ErrorNote, Surface } from '@/components/ui';
import {
  myGameReviewsQueryOptions,
  useCreateReview,
  useDeleteReview,
} from '@/lib/queries/reviews';
import { accountQueryOptions } from '@/lib/queries/user';

const RATINGS = Array.from({ length: 10 }, (_, i) => ((i + 1) / 2).toFixed(1));

export function ReviewComposer({ gameId }: { gameId: string }) {
  const account = useQuery(accountQueryOptions);
  const mine = useQuery({
    ...myGameReviewsQueryOptions(gameId, account.data?.id ?? ''),
    enabled: account.data != null,
  });

  const createReview = useCreateReview(gameId);
  const deleteReview = useDeleteReview(gameId);

  const [rating, setRating] = useState<string | null>(null);
  const [text, setText] = useState('');

  if (account.data == null || mine.isPending) return null;

  const existing = mine.data?.[0];
  if (existing) {
    return (
      <Surface className="mt-3 bg-brand-100 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-foreground">
            Your review · ★ {existing.rating}
          </Text>
          <Btn
            label="Delete"
            small
            disabled={deleteReview.isPending}
            onPress={() => deleteReview.mutate(existing.id)}
          />
        </View>
        {existing.reviewText && (
          <Text className="mt-3 text-sm leading-5 text-foreground">
            {existing.reviewText}
          </Text>
        )}
      </Surface>
    );
  }

  return (
    <Surface className="mt-3 p-4">
      <Text className="font-bold text-foreground">Rate it</Text>
      <View className="mt-3 flex-row flex-wrap">
        {RATINGS.map((r) => (
          <ChipButton
            key={r}
            label={r}
            selected={rating === r}
            className="mb-3 mr-3"
            onPress={() => setRating(r)}
          />
        ))}
      </View>

      <TextInput
        className="mt-1 min-h-20 rounded-none border-2 border-border bg-card p-3 text-sm text-foreground"
        placeholder="Say something about it (optional)…"
        placeholderTextColor="#78716C"
        multiline
        maxLength={5000}
        value={text}
        onChangeText={setText}
      />

      <Btn
        label={createReview.isPending ? 'Posting…' : 'Post review'}
        variant="primary"
        className="mt-4"
        disabled={rating == null || createReview.isPending}
        onPress={() =>
          rating != null &&
          createReview.mutate({
            rating,
            reviewText: text.trim() === '' ? undefined : text.trim(),
          })
        }
      />

      {createReview.isError && (
        <View className="mt-3">
          <ErrorNote label="Couldn’t post the review — try again." />
        </View>
      )}
    </Surface>
  );
}
