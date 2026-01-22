import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Gamepad2, Heart, User } from "lucide-react"

import { Poster } from "@/components/Poster"
import RecentReviews from "../RecentReviews"
import OldLogModal from "@/components/LogModal"
import { FeaturedGames } from "@/components/FeaturedGames"
import { Button } from "@/components/ui/button"
import { getAllGamesQueryOptions } from "@/lib/gameQuery"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"

type Game = {
  id: number
  title: string
  year: number
  dev?: string
  genre?: string
  color?: string
  cover_image?: string
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

// --- MAIN APP ---

export const MOCK_REVIEWS: Review[] = [
  { id: 101, gameId: 1, userId: 'user', rating: 5, text: "A masterpiece of open world design.", date: "2023-10-15", liked: true },
  { id: 102, gameId: 7, userId: 'user', rating: 4.5, text: "Just one more run...", date: "2023-11-02", liked: false },
  { id: 103, gameId: 12, userId: 'user', rating: 5, text: "Emotional damage.", date: "2023-11-20", liked: true },
];

export const Route = createFileRoute("/_authenticated/checkpoint")({
  component: Checkpointer,
})

export default function Checkpointer() {
  const [view, setView] = useState<'home' | 'profile' | 'game'>('home'); // home, profile, game
  
  // State initialization with Mock data as fallback
  const { data, isPending, error} = useQuery(getAllGamesQueryOptions)
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [watchlist, setWatchlist] = useState([3, 8]);
  const [favorites, setFavorites] = useState([1, 10, 16, 12]);
  
  const navigate = useNavigate();

  // Fetch Data from Node Server
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try fetching reviews
        const reviewsRes = await fetch(`/reviews`);
        if (reviewsRes.ok) setReviews(await reviewsRes.json());

        // Try fetching user profile
        const userRes = await fetch(`/user`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setWatchlist(userData.watchlist);
          setFavorites(userData.favorites);
        }
      } catch (err) {
        console.log("Server not running, using mock data.");
      }
    };
    fetchData();
  }, []);

  // Handlers
  const handleGameClick = (game: Game) => {
    setView('game');
    window.scrollTo(0, 0);
    navigate({ to: `/game/${game.id}` });
  };

  // --- SUB-VIEWS ---

  const HomeView = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 justify-center">
      {/* Hero Section */}
      <div
        // className={`
        //   relative rounded-2xl border-2 border-black shadow-2xl
        //   bg-rose-300 hover:bg-blue-300
        //   transition-colors duration-500
        //   filter-[contrast(170%)_brightness(1000%)]
        //   [background:linear-gradient(43deg,rgba(0,0,255,1),rgba(0,0,0,0)),url(/assets/noise.svg)]
        // `}
        className={
          `bg-lime-400 rounded-xl`
        }
      >
        <div className="relative z-20 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-end md:items-center">
          <div className="flex-1 space-y-4 items-center justify-center">
            <h2 className="text-4xl md:text-6xl font-black text-accent-foreground tracking-tighter uppercase">
              Welcome to <span className="text-black uppercase">Checkpointer</span>
            </h2>
            <p className="text-lg md:text-lg font-semibold text-black">
              Track and log games as you play
            </p>
            <Button
              variant='pop'
              onClick={() => {}}
              className="text-black text-center font-bold py-3 px-8 outline-black outline-2 hover:outline-4 hover:rounded-full active:text-xs"
            >
              Start Logging
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Reviews Feed */}
      <section className="flex flex-row items-center justify-between">
        {/* <OldLogModal isOpen={true} onClose={()=>{}} /> */}
        {/* <RecentReviews /> */}
        {isPending ? (
          <div>Loading games...</div>
        ) : (
          <FeaturedGames games={data.games} />
        )}
      </section>
    </div>
  );

  const ProfileView = () => {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 max-w-full">
        {/* Profile Header */}
        <div className="flex flex-col w-full md:flex-row items-center gap-8 pb-8 border-b border-zinc-100">

            {/* profile picture */}
          <div className="w-32 h-32 rounded-full bg-linear-to-tr from-green-400 to-blue-600 p-1 shrink-0">
            <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
               <User className="w-16 h-16 text-zinc-700" />
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-4 flex-1">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-black">PlayerOne</h1>
                <p className="text-zinc-800 text-sm">Joined December 2023</p>
              </div>
              <button className="px-4 py-2 bg-transparent border border-zinc-800 text-black rounded hover:bg-zinc-800 hover:text-blue-600 transition-colors text-xs font-bold uppercase tracking-wider">
                Edit Profile
              </button>
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-8">
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-black">{reviews.length}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Games</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-black">2023</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">This Year</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold text-black">{watchlist.length}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Watchlist</span>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites */}
        <section>
          <h2 className="text-black text-sm font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">Favorite Games</h2>
          {favorites.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {favorites.map(id => {
                 const game = data.games.find((g: Game) => g.id === id);
                 if (!game) return null;
                 return <Poster key={id} game={game} size="md" onClick={handleGameClick} />;
              })}
            </div>
          ) : (
             <div className="h-32 bg-indigo-400/10 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
                Select your top 4 games
             </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="grid md:grid-cols-4 gap-8">
           <div className="md:col-span-3">
             <h2 className="text-zinc-300 text-sm font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">Recent Diary</h2>
             <div className="space-y-4">
                {reviews.map(review => {
                  const game = data.games.find((g : Game) => g.id === review.gameId);
                  if (!game) return null;
                  return (
                    <div key={review.id} className="flex gap-4 py-4 border-b border-zinc-800/50 last:border-0">
                       <div className="w-12 h-16 shrink-0 bg-zinc-800 rounded overflow-hidden cursor-pointer" onClick={() => handleGameClick(game)}>
                          <div className={`w-full h-full bg-linear-to-br ${game.color ?? ""}`} />
                       </div>
                       <div>
                          <div className="flex items-baseline gap-2">
                             <span className="text-black font-bold hover:underline cursor-pointer" onClick={() => handleGameClick(game)}>{game.title}</span>
                             <span className="text-zinc-500 text-xs">{game.year}</span>
                          </div>
                          <div className="flex items-center gap-2 my-1">
                             <StarRating rating={review.rating} />
                             {review.liked && <Heart className="w-3 h-3 text-red-500 fill-red-500" />}
                          </div>
                          <p className="text-black text-sm font-serif">{review.text}</p>
                       </div>
                    </div>
                  )
                })}
             </div>
           </div>

           <div>
              <h2 className="text-zinc-300 text-sm font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">Watchlist</h2>
              <div className="grid grid-cols-2 gap-2">
                {watchlist.map(id => {
                   const game = data.games.find((g : Game) => g.id === id);
                   if (!game) return null;
                   return <Poster key={id} game={game} size="sm" onClick={handleGameClick} />;
                })}
              </div>
           </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-w-full overflow-x-hidden text-black selection:bg-green-500/30 outline-black rounded-xl">
      
      {/* --- NAVBAR --- */}
    {/* <Navbar logModalTrigger={showLogModal}/> */}
    <Navbar/>

      {/* --- CONTENT --- */}
      <main className="container w-screen mx-auto my-4 px-4 py-8 min-h-[calc(100vh-64px)] bg-orange-300 border-2 border-black rounded-xl"
      >
        {view === 'home' && <HomeView />}
        {/* {view === 'game' && navigate(`/game/${activeGame.id}`)} */}
        {view === 'profile' && <ProfileView />}
      </main>
      {/* Global Styles for nicer scrollbar */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { bg: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}