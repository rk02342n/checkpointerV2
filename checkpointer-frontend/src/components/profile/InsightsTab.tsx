import { useQuery } from "@tanstack/react-query";
import { insightsQueryOptions, type InsightsData } from "@/lib/insightsQuery";
import { Link } from "@tanstack/react-router";
import {
  Gamepad2,
  Heart,
  Star,
  Users,
  ListPlus,
  Bookmark,
  FileText,
  CalendarHeart,
  TrendingUp,
  Trophy,
  Archive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Props = { themed: boolean };

const GENRE_COLORS = [
  "hsl(25, 95%, 53%)",   // orange
  "hsl(45, 93%, 47%)",   // amber
  "hsl(142, 71%, 45%)",  // green
  "hsl(199, 89%, 48%)",  // sky
  "hsl(262, 83%, 58%)",  // violet
  "hsl(346, 77%, 50%)",  // rose
  "hsl(172, 66%, 50%)",  // teal
  "hsl(31, 97%, 60%)",   // orange lighter
  "hsl(221, 83%, 53%)",  // blue
  "hsl(280, 67%, 50%)",  // purple
];

const monthlyActivityConfig = {
  count: {
    label: "Sessions",
    color: "hsl(25, 95%, 53%)",
  },
} satisfies ChartConfig;

const ratingDistributionConfig = {
  count: {
    label: "Reviews",
    color: "hsl(45, 93%, 47%)",
  },
} satisfies ChartConfig;

export function InsightsTab({ themed }: Props) {
  const { data, isPending, isError } = useQuery(insightsQueryOptions);

  if (isPending) return <InsightsSkeleton />;
  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-foreground font-bold mb-2">
          Failed to load insights
        </p>
        <p className="text-muted-foreground text-sm">
          Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GamingHabitsSection data={data.gaming} themed={themed} />
      <GenreBreakdownSection data={data.genres} themed={themed} />
      <ReviewStatsSection data={data.reviews} themed={themed} />
      <SocialInsightsSection data={data.social} themed={themed} />
    </div>
  );
}

// ── Gaming Habits ──────────────────────────────────────────────

function GamingHabitsSection({
  data,
  themed,
}: {
  data: InsightsData["gaming"];
  themed: boolean;
}) {
  const cardClass = `${themed ? "profile-accent" : "bg-card"} border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-4`;

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
        <Gamepad2 className="w-4 h-4" />
        Gaming Habits
      </h3>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground">
            {data.totalGamesPlayed}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Games Played
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <Trophy className="w-5 h-5 text-green-500" />
            {data.gamesFinished}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Finished
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <Archive className="w-5 h-5 text-amber-500" />
            {data.gamesStashed}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Stashed
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground">
            {data.completionRate}%
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Completion Rate
          </div>
        </div>
      </div>

      {/* Completion rate progress bar */}
      {(data.gamesFinished > 0 || data.gamesStashed > 0) && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Finished vs Stashed</span>
            <span>
              {data.gamesFinished} / {data.gamesFinished + data.gamesStashed}
            </span>
          </div>
          <div className="w-full h-3 bg-muted border-2 border-border overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${data.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Monthly activity chart */}
      {data.monthlyActivity.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
            Monthly Activity (Last 12 Months)
          </div>
          <ChartContainer config={monthlyActivityConfig} className="h-[200px] w-full">
            <BarChart data={data.monthlyActivity}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => {
                  const [, month] = value.split("-");
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return months[parseInt(month, 10) - 1];
                }}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: unknown) => {
                      const str = String(value);
                      const [year, month] = str.split("-");
                      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                      return `${months[parseInt(month, 10) - 1]} ${year}`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {data.totalGamesPlayed === 0 && (
        <EmptyState icon={Gamepad2} message="No gaming sessions logged yet" />
      )}
    </section>
  );
}

// ── Genre Breakdown ────────────────────────────────────────────

function GenreBreakdownSection({
  data,
}: {
  data: InsightsData["genres"];
  themed: boolean;
}) {
  if (data.length === 0) {
    return (
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Top Genres
        </h3>
        <EmptyState
          icon={TrendingUp}
          message="Play some games to see your genre breakdown"
        />
      </section>
    );
  }

  const genreConfig: ChartConfig = Object.fromEntries(
    data.map((g, i) => [
      g.name,
      { label: g.name, color: GENRE_COLORS[i % GENRE_COLORS.length] },
    ])
  );

  const pieData = data.map((g, i) => ({
    name: g.name,
    value: g.count,
    fill: GENRE_COLORS[i % GENRE_COLORS.length],
  }));

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Top Genres
      </h3>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Pie chart */}
        <ChartContainer config={genreConfig} className="h-[250px] w-full md:w-1/2">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              strokeWidth={2}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend list */}
        <div className="flex-1 space-y-2">
          {data.map((genre, i) => (
            <div key={genre.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 shrink-0 border border-border"
                style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
              />
              <span className="text-sm text-foreground font-medium flex-1 truncate">
                {genre.name}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {genre.count} {genre.count === 1 ? "game" : "games"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Review Stats ───────────────────────────────────────────────

function ReviewStatsSection({
  data,
  themed,
}: {
  data: {
    totalReviews: number;
    avgRating: number | null;
    ratingDistribution: Array<{ rating: number; count: number }>;
    totalLikesReceived: number;
    mostLikedReview: {
      id: string;
      gameId: string;
      gameName: string;
      rating: string | null;
      likeCount: number;
    } | null;
  };
  themed: boolean;
}) {
  const cardClass = `${themed ? "profile-accent" : "bg-card"} border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-4`;

  if (data.totalReviews === 0) {
    return (
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
          <Star className="w-4 h-4" />
          Review Stats
        </h3>
        <EmptyState icon={Star} message="No reviews written yet" />
      </section>
    );
  }

  // Build full 0-5 distribution for the chart
  const fullDistribution = Array.from({ length: 6 }, (_, i) => {
    const existing = data.ratingDistribution.find((r) => r.rating === i);
    return { rating: `${i}`, count: existing?.count ?? 0 };
  });

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
        <Star className="w-4 h-4" />
        Review Stats
      </h3>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground">
            {data.totalReviews}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Reviews Written
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            {data.avgRating !== null ? data.avgRating.toFixed(1) : "—"}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Avg Rating Given
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            {data.totalLikesReceived}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Likes Received
          </div>
        </div>
      </div>

      {/* Rating distribution chart */}
      {data.ratingDistribution.length > 0 && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
            Rating Distribution
          </div>
          <ChartContainer config={ratingDistributionConfig} className="h-[180px] w-full">
            <BarChart data={fullDistribution}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="rating"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => `${value}★`}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value: unknown) => `${value} Star${String(value) === "1" ? "" : "s"}`}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Most liked review */}
      {data.mostLikedReview && (
        <div className={`${cardClass} flex items-center gap-3`}>
          <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Most Liked Review
            </div>
            <Link
              to="/games/$gameId"
              params={{ gameId: data.mostLikedReview.gameId }}
              className="text-sm font-bold text-foreground hover:underline truncate block"
            >
              {data.mostLikedReview.gameName}
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data.mostLikedReview.rating && (
              <span className="text-sm text-muted-foreground flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {data.mostLikedReview.rating}
              </span>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-0.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              {data.mostLikedReview.likeCount}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Social Insights ────────────────────────────────────────────

function SocialInsightsSection({
  data,
  themed,
}: {
  data: {
    followerCount: number;
    followingCount: number;
    listsCreated: number;
    listsSavedByOthers: number;
    blogPostsPublished: number;
    wishlistSize: number;
  };
  themed: boolean;
}) {
  const cardClass = `${themed ? "profile-accent" : "bg-card"} border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] p-4`;

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Social & Content
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground">
            {data.followerCount}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Followers
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground">
            {data.followingCount}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Following
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <ListPlus className="w-5 h-5 text-blue-500" />
            {data.listsCreated}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Lists Created
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <Bookmark className="w-5 h-5 text-violet-500" />
            {data.listsSavedByOthers}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Lists Saved by Others
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <FileText className="w-5 h-5 text-emerald-500" />
            {data.blogPostsPublished}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Posts Published
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
            <CalendarHeart className="w-5 h-5 text-rose-500" />
            {data.wishlistSize}
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Wishlist Size
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Shared Components ──────────────────────────────────────────

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Gaming habits skeleton */}
      <div>
        <div className="h-5 w-32 bg-muted-foreground/20 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-muted border-4 border-border p-4 animate-pulse"
            >
              <div className="h-8 w-16 bg-muted-foreground/20 mb-2" />
              <div className="h-3 w-20 bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        <div className="h-[200px] bg-muted border-4 border-border animate-pulse" />
      </div>

      {/* Genre breakdown skeleton */}
      <div>
        <div className="h-5 w-28 bg-muted-foreground/20 mb-4" />
        <div className="h-[250px] bg-muted border-4 border-border animate-pulse" />
      </div>

      {/* Review stats skeleton */}
      <div>
        <div className="h-5 w-28 bg-muted-foreground/20 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-muted border-4 border-border p-4 animate-pulse"
            >
              <div className="h-8 w-16 bg-muted-foreground/20 mb-2" />
              <div className="h-3 w-20 bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Social skeleton */}
      <div>
        <div className="h-5 w-36 bg-muted-foreground/20 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-muted border-4 border-border p-4 animate-pulse"
            >
              <div className="h-8 w-16 bg-muted-foreground/20 mb-2" />
              <div className="h-3 w-20 bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
