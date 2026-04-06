import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type GameReview } from "@/lib/reviewsQuery";

interface TopReviewsSectionProps {
    title: string;
    reviewsSectionRef: React.RefObject<HTMLDivElement | null>;
    loadingCreateReview: { review?: { rating?: string | number; reviewText?: string | null } } | undefined;
    dbUserData: any;
    reviewsLoading: boolean;
    gameReviews: GameReview[];
    handleLikeClick: (reviewId: string) => void;
    likePending: boolean;
    visibleCount: number;
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
}

function ReviewsSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2].map((i) => (
                <div key={i} className="bg-background border-4 border-border text-foreground p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Skeleton className="w-6 h-6 rounded-full bg-muted shrink-0" />
                            <Skeleton className="h-4 w-16 sm:w-20 bg-muted" />
                        </div>
                        <Skeleton className="h-4 w-20 sm:w-24 bg-muted" />
                    </div>
                    <Skeleton className="h-4 w-full mt-2 bg-muted" />
                    <Skeleton className="h-4 w-3/4 mt-2 bg-muted" />
                </div>
            ))}
        </div>
    );
}

export function TopReviewsSection({
    title,
    reviewsSectionRef,
    loadingCreateReview,
    dbUserData,
    reviewsLoading,
    gameReviews,
    handleLikeClick,
    likePending,
    visibleCount,
    setVisibleCount,
}: TopReviewsSectionProps) {
    const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
    const reviewsPerPage = 4;
    const visibleReviews = gameReviews.slice(0, visibleCount);
    const hasMoreReviews = visibleCount < gameReviews.length;

    return (
        <div ref={reviewsSectionRef} className="bg-blue-400 dark:bg-blue-700/40 border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] p-4 sm:p-6 text-foreground">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest border-b-2 border-border pb-2 mb-4">
                {title}
            </h3>
            {loadingCreateReview?.review && (
                <div className="space-y-4 mb-4">
                    <div className="bg-orange-50 border-4 border-border p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="w-6 h-6 border-2 border-stone-900 shrink-0">
                                    <AvatarImage
                                        src={dbUserData?.account?.avatarUrl
                                            ? (dbUserData.account.avatarUrl.startsWith('http')
                                                ? dbUserData.account.avatarUrl
                                                : `/api/user/avatar/${dbUserData.account.id}?v=${encodeURIComponent(dbUserData.account.avatarUrl)}`)
                                            : undefined}
                                        alt={dbUserData?.account?.username || 'You'}
                                    />
                                    <AvatarFallback className="bg-orange-400 text-stone-900 text-xs font-bold">
                                        {dbUserData?.account?.username
                                            ? dbUserData.account.username.slice(0, 2).toUpperCase()
                                            : 'YO'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-bold text-foreground">
                                    {dbUserData?.account?.username ? `@${dbUserData.account.username}` : 'You'}
                                </span>
                            </div>
                            <StarRating rating={Number(loadingCreateReview.review.rating)} size="sm" />
                        </div>
                        <p className="text-stone-700 text-sm p-2">"{loadingCreateReview.review.reviewText}"</p>
                    </div>
                </div>
            )}
            {reviewsLoading ? (
                <ReviewsSkeleton />
            ) : gameReviews?.length > 0 ? (
                <>
                    <div className="space-y-4">
                        {visibleReviews.map((r: GameReview) => {
                            const initials = r.username
                                ? r.username.slice(0, 2).toUpperCase()
                                : r.displayName
                                    ? r.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    : '?';
                            const REVIEW_CHAR_LIMIT = 200;
                            const isLong = r.reviewText != null && r.reviewText.length > REVIEW_CHAR_LIMIT;
                            const isExpanded = expandedReviews.has(r.id);
                            return (
                                <div key={r.id} className="bg-background border-4 border-border p-3 sm:p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <Link
                                            to={r.userId === dbUserData?.account?.id ? "/profile" : "/users/$userId"}
                                            params={r.userId === dbUserData?.account?.id ? {} : { userId: r.userId }}
                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Avatar className="w-6 h-6 border-2 border-stone-900 shrink-0">
                                                <AvatarImage
                                                    src={r.avatarUrl
                                                        ? (r.avatarUrl.startsWith('http') ? r.avatarUrl : `/api/user/avatar/${r.userId}?v=${encodeURIComponent(r.avatarUrl)}`)
                                                        : undefined
                                                    }
                                                    alt={r.username || 'User'}
                                                />
                                                <AvatarFallback className="bg-orange-400 text-stone-900 text-xs font-bold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-foreground hover:underline truncate">{r.userId === dbUserData?.account?.id ? 'You' : ('@' + r.username || r.displayName || 'Anonymous')}</span>
                                        </Link>
                                        <StarRating rating={Number(r.rating)} size="sm" />
                                    </div>
                                    <div className="text-foreground text-sm p-2 text-left">
                                        <p>
                                            {isLong && !isExpanded
                                                ? r.reviewText!.slice(0, REVIEW_CHAR_LIMIT) + '…'
                                                : r.reviewText}
                                        </p>
                                        {isLong && (
                                            <button
                                                onClick={() => setExpandedReviews(prev => {
                                                    const next = new Set(prev);
                                                    if (isExpanded) next.delete(r.id);
                                                    else next.add(r.id);
                                                    return next;
                                                })}
                                                className="text-xs font-semibold text-orange-500 hover:text-orange-400 mt-1"
                                            >
                                                {isExpanded ? 'less' : 'more'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-stone-200">
                                        <button
                                            onClick={() => handleLikeClick(r.id)}
                                            disabled={likePending}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
                                                r.userLiked
                                                    ? 'text-orange-400 hover:text-orange-300'
                                                    : 'text-stone-600 hover:text-orange-300'
                                            } ${likePending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Heart className={`w-3 h-3 ${r.userLiked ? 'fill-current' : ''}`} />
                                            <span>{r.likeCount}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {hasMoreReviews && (
                        <div className="flex items-center justify-center mt-4 pt-4 border-t-2 border-stone-200">
                            <Button
                                variant="outline"
                                onClick={() => setVisibleCount(prev => prev + reviewsPerPage)}
                                className="px-6 py-2 text-sm"
                            >
                                Load More ({gameReviews.length - visibleCount} remaining)
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-stone-500 text-sm italic">No reviews yet</p>
            )}
        </div>
    );
}
