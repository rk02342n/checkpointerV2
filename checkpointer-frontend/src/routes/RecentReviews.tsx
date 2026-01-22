import { useEffect, useState } from "react";
import { Heart, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";


type Game = {
  id: number
  title: string
  year: number
  dev: string
  genre: string
  color: string
}

type Review = {
  id: number
  gameId: number
  userId: string
  rating: number
  text: string
  date: string
  liked: boolean
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const stars = "★★★★★"
  return (
    <span className="text-black text-xs" aria-label={`Rating: ${rating} / 5`}>
      {stars.slice(0, fullStars)}
      {hasHalf ? "½" : ""}
    </span>
  )
}

function Poster({
  game,
  className,
  onClick,
}: {
  game: Game
  className?: string
  onClick?: (game: Game) => void
  size?: "sm" | "md" | "lg"
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(game)}
      className={[
        "rounded-lg border-2 border-black overflow-hidden",
        "bg-linear-to-br",
        game.color,
        className ?? "",
      ].join(" ")}
      aria-label={`Open ${game.title}`}
    >
      <span className="sr-only">{game.title}</span>
    </button>
  )
}

const RecentReviews = () => {
  const games: Game[] = [
    { id: 1, title: "Elden Ring", year: 2022, dev: "FromSoftware", genre: "RPG", color: "from-amber-700 to-yellow-900" },
    { id: 2, title: "Baldur's Gate 3", year: 2023, dev: "Larian", genre: "RPG", color: "from-red-900 to-purple-900" },
    { id: 3, title: "Hollow Knight", year: 2017, dev: "Team Cherry", genre: "Metroidvania", color: "from-slate-700 to-slate-900" },
    { id: 4, title: "Breath of the Wild", year: 2017, dev: "Nintendo", genre: "Adventure", color: "from-sky-400 to-emerald-400" },
    { id: 5, title: "Cyberpunk 2077", year: 2020, dev: "CDPR", genre: "RPG", color: "from-yellow-400 to-yellow-600 text-black" },
    { id: 6, title: "God of War", year: 2018, dev: "Santa Monica", genre: "Action", color: "from-blue-800 to-slate-800" },
    { id: 7, title: "Hades", year: 2020, dev: "Supergiant", genre: "Roguelike", color: "from-red-600 to-orange-600" },
    { id: 8, title: "Stardew Valley", year: 2016, dev: "ConcernedApe", genre: "Sim", color: "from-green-500 to-emerald-700" },
    { id: 9, title: "The Last of Us Part II", year: 2020, dev: "Naughty Dog", genre: "Action", color: "from-stone-800 to-stone-950" },
    { id: 10, title: "Disco Elysium", year: 2019, dev: "ZA/UM", genre: "RPG", color: "from-orange-200 to-orange-400 text-black" },
    { id: 11, title: "Outer Wilds", year: 2019, dev: "Mobius", genre: "Adventure", color: "from-indigo-900 to-purple-900" },
    { id: 12, title: "Celeste", year: 2018, dev: "EXOK", genre: "Platformer", color: "from-pink-500 to-purple-600" },
    { id: 13, title: "Portal 2", year: 2011, dev: "Valve", genre: "Puzzle", color: "from-cyan-600 to-blue-700" },
    { id: 14, title: "Bloodborne", year: 2015, dev: "FromSoftware", genre: "RPG", color: "from-neutral-900 to-neutral-950" },
    { id: 15, title: "Minecraft", year: 2011, dev: "Mojang", genre: "Sandbox", color: "from-green-600 to-green-800" },
    { id: 16, title: "Persona 5 Royal", year: 2020, dev: "Atlus", genre: "JRPG", color: "from-red-600 to-red-800" },
  ];
  
  const reviews: Review[] = [
    { id: 101, gameId: 1, userId: 'user', rating: 5, text: "A masterpiece of open world design.", date: "2023-10-15", liked: true },
    { id: 102, gameId: 7, userId: 'user', rating: 4.5, text: "Just one more run...", date: "2023-11-02", liked: false },
    { id: 103, gameId: 12, userId: 'user', rating: 5, text: "Emotional damage.", date: "2023-11-20", liked: true },
  ];
  
    const [ recentReviews, setRecentReviews ] = useState<Review[]>([]);

    const navigate = useNavigate();

    useEffect(() => {
      setRecentReviews(
        [...reviews]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4)
      );
    }, []);

    const handleGameClick = (game: Game) => {
      navigate({ to: `/game/${game.id}` });
  }

    return(
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <h2 className="text-black text-sm font-bold uppercase tracking-widest">Recent Reviews</h2>
          </div>
          <div className="space-y-4">
            {recentReviews.map((review) => {
              const game = games.find((g) => g.id === review.gameId);
              if (!game) return null;
              return (
                <div key={review.id} className="bg-blue-400 hover:bg-red-400 border-black border-2 p-4 rounded-xl flex gap-4 hover:border-zinc-700 transition-colors">
                  <div className="shrink-0">
                    <Poster game={game} size="sm" onClick={handleGameClick} className='w-30 h-30' />
                    {/* <GameCard size="md"/> */}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-black hover:underline cursor-pointer" onClick={() => handleGameClick(game)}>{game.title}</span>
                      <span className="text-black text-xs">{game.year}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <StarRating rating={review.rating} />
                      {review.liked && <Heart className="w-3 h-3 text-red-500 fill-red-500" />}
                    </div>
                    <p className="text-black text-sm italic font-serif text-start">"{review.text}"</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-black">
                      <User className="w-3 h-3" />
                      <span>Reviewed by You</span>
                      <span>•</span>
                      <span>{review.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    );
}

export default RecentReviews;
