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
      <nav className="sticky top-0 z-40 bg-orange-300 border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] mb-6 mx-4 mt-4">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => { navigate({to: `/`});}}
        >
          <Gamepad2 className="w-8 h-8 text-stone-900 group-hover:text-white transition-colors stroke-2" />
          <span className="text-xl font-bold text-stone-900 tracking-tight hidden md:block font-serif">Checkpointer</span>
        </div>

        {/* Mobile Search Button - navigates to browse page */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 bg-white border-4 border-stone-900 hover:bg-stone-50 transition-colors"
          onClick={() => navigate({to: `/browse`})}
          aria-label="Search games"
        >
          <Search className="w-5 h-5 text-stone-900" />
        </button>

        {/* Search Component and Logic - Desktop only */}
        <div className="flex-1 max-w-lg relative hidden md:block text-stone-900">
          <Input
            type="text"
            placeholder="Search games..."
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-4 border-stone-900 text-stone-900 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm rounded-none"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-600" />
          {/* Search Dropdown */}
          {debouncedSearchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] overflow-hidden max-h-64 overflow-y-auto z-50">
              {isLoading ? (
                <div className="p-4 text-center text-stone-500 text-sm">Searching...</div>
              ) : isError ? (
                <div className="p-4 text-center text-rose-600 text-sm">Error searching games. Please try again.</div>
              ) : games.length > 0 ? (
                games.map(game => {
                  const year = formatYear(game.releaseDate);
                  return (
                    <div
                      key={game.id}
                      onClick={() => handleGameClick(game.id)}
                      className="flex items-center justify-start gap-3 p-3 hover:bg-orange-50 border-b-2 border-stone-200 last:border-b-0 cursor-pointer transition-colors"
                    >
                      {game.coverUrl ? (
                        <img
                          className='w-10 h-10 object-cover border-2 border-stone-900'
                          src={game.coverUrl}
                          alt={game.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className='w-10 h-10 bg-stone-200 border-2 border-stone-900 flex items-center justify-center'>
                          <Gamepad2 className="w-5 h-5 text-stone-500" />
                        </div>
                      )}
                      <div className="flex flex-col justify-start line-clamp-1 items-start flex-1 min-w-0">
                        <div className="text-stone-900 text-sm font-semibold truncate w-full">{game.name}</div>
                        {year && <div className="text-stone-600 text-xs">{year}</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-stone-500 text-sm">No games found.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {isAdmin && (
            <button
              className="hidden md:flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wide hover:text-white transition-colors"
              onClick={() => { navigate({to: `/admin`});}}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wide hover:text-white focus:outline-none transition-colors">
                <User className="w-4 h-4" />
                <span>Account</span>
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none">
                <DropdownMenuItem
                  onClick={() => navigate({to: `/profile`})}
                  className="cursor-pointer font-medium rounded-none hover:bg-orange-50"
                >
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-stone-300" />
                <DropdownMenuItem asChild variant="destructive" className="cursor-pointer font-medium rounded-none">
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
              className="hidden md:flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wide hover:text-white transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Sign Up</span>
            </a>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-900 border-4 border-stone-900 px-4 py-2 font-semibold transition-all text-sm"
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
