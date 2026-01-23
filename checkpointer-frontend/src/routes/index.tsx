import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Heart } from "lucide-react"
import { FeaturedGames } from "@/components/FeaturedGames"
import { Button } from "@/components/ui/button"
import { getAllGamesQueryOptions, type Game } from "@/lib/gameQuery"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"

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

export const Route = createFileRoute("/")({
  component: Checkpointer,
})

export default function Checkpointer() {
  const [view, setView] = useState<'home' | 'profile' | 'game'>('home'); // home, profile, game
  
  // State initialization with Mock data as fallback
  const { data, isPending} = useQuery(getAllGamesQueryOptions)
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  
  const navigate = useNavigate();

  // Fetch Data from Node Server

  // Handlers
  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0);
    navigate({ to: `/games/${game.id}` });
  };

  // --- SUB-VIEWS ---

  const HomeView = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 justify-center">
      {/* Hero Section */}
      <div
        // className={`
        //   relative rounded-2xl border-2 border-black shadow-2xl
        //   bg-sky-300 hover:bg-black
        //   transition-colors duration-200
        //   filter-[contrast(170%)_brightness(1000%)]
        //   [background:linear-gradient(43deg,rgba(185,0,25,1),rgba(100,100,0,0)),url(assets/noise.svg)]
        // `}
        className={`
          relative rounded-2xl border-2 border-black shadow-2xl
          bg-sky-300 hover:bg-rose-400
          transition-colors duration-200
          filter-[contrast(170%)_brightness(1000%)]
          [background:linear-gradient(43deg,rgba(0,0,255,1),rgba(100,100,0,0)),url(assets/noise.svg)]
        `}
      >
        <div className="relative z-20 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-end md:items-center">
          <div className="flex-1 space-y-4 items-center justify-center">
            <h2 className="text-4xl md:text-5xl font-black font-serif text-accent-foreground tracking-tighter uppercase text-right">
              Welcome to  <span className="text-black uppercase">Checkpointer</span>
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
      <section
        className="
          flex flex-row items-center justify-between
          px-4 py-6 rounded-xl border-black border-2
          bg-[rgb(78,195,90)]
          
        "
      >
        {/* <OldLogModal isOpen={true} onClose={()=>{}} /> */}
        {/* <RecentReviews /> */}
        {isPending ? (
          <div>Loading games...</div>
        ) : (
          <FeaturedGames games={data.games} limit={8} onGameClick={handleGameClick} />
        )}
      </section>
    </div>
  );

  const ProfileView = () => {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 max-w-full">
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
      <main className="container w-screen mx-auto my-4 px-4 py-8 min-h-[calc(100vh-64px)] bg-[rgb(255,220,159)] border-2 border-black rounded-xl"
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