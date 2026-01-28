import { Gamepad2, Search, User, Plus, Shield, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useQuery } from "@tanstack/react-query";
import { getSearchGamesQueryOptions } from "@/lib/gameQuery";
import { useDebounce } from "@/lib/useDebounce";
import { type Game } from "@/lib/gameQuery";
import { dbUserQueryOptions } from "@/lib/api";
import LogModal from "./LogModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavbarProps {
  logModalTrigger?: boolean;
}

const Navbar: React.FC<NavbarProps> = () => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [showLogModal, setShowLogModal] = useState<boolean>(false);

    // Debounce search query to avoid excessive API calls
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Get current user to check for admin role and login status
    const { data: dbUserData, isError: isAuthError } = useQuery({
      ...dbUserQueryOptions,
      retry: false,
    });
    const isLoggedIn = !!dbUserData?.account && !isAuthError;
    const isAdmin = dbUserData?.account?.role === 'admin';

    // Use React Query for search with debounced query
    const { data, isLoading, isError } = useQuery(
      getSearchGamesQueryOptions(debouncedSearchQuery)
    );

    const games: Game[] = data?.games || [];

    const handleGameClick = (id: string | number): void => {
        navigate({to: `/games/${id}`});
        setSearchQuery('');
    }

    const formatYear = (value: Game["releaseDate"]) => {
      if (!value) return null;
      const d = typeof value === "string" ? new Date(value) : value;
      const y = d.getFullYear();
      return Number.isFinite(y) ? y : null;
    }

    return(
      <nav className="sticky top-0 z-40 bg-red-400 backdrop-blur-md border-2 border-black rounded-xl mb-4 mx-4 mt-2">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => { navigate({to: `/`});}}
        >
          <Gamepad2 className="w-8 h-8 text-black group-hover:text-amber-100 transition-colors stroke-1" />
          <span className="text-xl font-black text-black tracking-tighter hidden md:block font-serif">Checkpointer</span>
        </div>

        {/* Search Component and Logic */}
        <div className="flex-1 max-w-lg relative hidden md:block text-black">
          <Input 
            type="text"
            placeholder="Search games..."
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-black text-black rounded-full py-2 pl-10 pr-4 focus:outline-black focus:outline-4 text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-black" />
          {/* Search Dropdown */}
          {debouncedSearchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto z-50">
              {isLoading ? (
                <div className="p-4 text-center text-zinc-500 text-sm">Searching...</div>
              ) : isError ? (
                <div className="p-4 text-center text-red-500 text-sm">Error searching games. Please try again.</div>
              ) : games.length > 0 ? (
                games.map(game => {
                  const year = formatYear(game.releaseDate);
                  return (
                    <div 
                      key={game.id}
                      onClick={() => handleGameClick(game.id)}
                      className="flex items-center justify-start gap-3 p-3 hover:bg-zinc-100 border-b border-zinc-200 last:border-b-0 cursor-pointer transition-colors"
                    >
                      {game.coverUrl ? (
                        <img 
                          className='w-10 h-10 object-cover outline-black outline-1 rounded' 
                          src={game.coverUrl} 
                          alt={game.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className='w-10 h-10 bg-zinc-200 rounded outline-black outline-1 flex items-center justify-center'>
                          <Gamepad2 className="w-5 h-5 text-zinc-500" />
                        </div>
                      )}
                      <div className="flex flex-col justify-start line-clamp-1 items-start flex-1 min-w-0">
                        <div className="text-black text-sm font-bold truncate w-full">{game.name}</div>
                        {year && <div className="text-black text-xs">{year}</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-zinc-500 text-sm">No games found.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {isAdmin && (
            <button
              className="hidden md:flex items-center gap-2 text-black text-xs font-bold uppercase tracking-widest hover:text-white active:text-amber-600"
              onClick={() => { navigate({to: `/admin`});}}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex items-center gap-2 text-black text-xs font-bold uppercase tracking-widest hover:text-white focus:outline-none">
                <User className="w-4 h-4" />
                <span>Account</span>
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-2 border-black">
                <DropdownMenuItem
                  onClick={() => navigate({to: `/profile`})}
                  className="cursor-pointer font-medium"
                >
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-black/20" />
                <DropdownMenuItem asChild variant="destructive" className="cursor-pointer font-medium">
                  <a href="/api/logout">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a
              href="/api/login"
              className="hidden md:flex items-center gap-2 text-black text-xs font-bold uppercase tracking-widest hover:text-white active:text-green-600"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Sign Up</span>
            </a>
          )}
          <Button
            className="flex items-center gap-2 bg-white hover:bg-green-500 text-black border-black border-2 px-4 py-2 rounded font-bold transition-colors text-sm active:text-white"
            onClick={() => inputRef?.current?.focus()}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Log Game</span>
          </Button>
          <LogModal
            isOpen={showLogModal}
            onClose={() => setShowLogModal(false)}
          />
        </div>
      </div>
    </nav>
    );
}
    
export default Navbar;
