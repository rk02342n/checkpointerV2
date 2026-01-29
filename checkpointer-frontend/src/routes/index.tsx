import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FeaturedGames, FeaturedGamesSkeleton } from "@/components/FeaturedGames"
import { Button } from "@/components/ui/button"
import { getAllGamesQueryOptions, type Game } from "@/lib/gameQuery"
import { useQuery } from "@tanstack/react-query"
import Navbar from "@/components/Navbar"

export const Route = createFileRoute("/")({
  component: Checkpointer,
})

export default function Checkpointer() {
  const { data, isPending} = useQuery(getAllGamesQueryOptions)
  const navigate = useNavigate();

  const handleGameClick = (game: Game) => {
    window.scrollTo(0, 0);
    navigate({ to: `/games/${game.id}` });
  };

  return (
    <div className="min-w-full overflow-x-hidden text-black selection:bg-green-500/30 outline-black rounded-xl">
      <Navbar/>

      <main className="container w-screen mx-auto my-4 px-4 py-8 min-h-[calc(100vh-64px)] bg-[rgb(255,220,159)] border-2 border-black rounded-xl">
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 justify-center">
          {/* Hero Section */}
          <div
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
                  onClick={() => navigate({ to: '/browse' })}
                  className="text-black text-center font-bold py-3 px-8 outline-black outline-2 hover:outline-4 hover:rounded-full active:text-xs"
                >
                  Start Logging
                </Button>
              </div>
            </div>
          </div>

          {/* Featured Games */}
          <section
            className="
              flex flex-row items-center justify-between
              px-4 py-6 rounded-xl border-black border-2
              bg-[rgb(78,195,90)]
            "
          >
            {isPending ? (
              <FeaturedGamesSkeleton count={4} />
            ) : (
              <FeaturedGames games={data.games} limit={8} onGameClick={handleGameClick} />
            )}
          </section>
        </div>
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
