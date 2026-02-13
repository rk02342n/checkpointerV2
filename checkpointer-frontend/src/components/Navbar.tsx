import { Gamepad2, Search, User, Plus, Shield, LogIn, LogOut, ChevronDown, Sun, Moon, Signature } from "lucide-react";
import { usePostHog } from 'posthog-js/react'
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useQuery } from "@tanstack/react-query";
import { getSearchGamesQueryOptions } from "@/lib/gameQuery";
import { useDebounce } from "@/lib/useDebounce";
import { type Game } from "@/lib/gameQuery";
import { dbUserQueryOptions } from "@/lib/api";
import { useSettings } from "@/lib/settingsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogGameModal } from "./LogGameModal";

interface NavbarProps {
  logModalTrigger?: boolean;
}

const Navbar: React.FC<NavbarProps> = () => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [logGameModalOpen, setLogGameModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { settings } = useSettings();
    const posthog = usePostHog();

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
        posthog.capture('navbar_search_result_clicked', { game_id: String(id), query: searchQuery });
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
      <nav className="sticky top-0 z-40 bg-primary border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] mb-0 mx-4 mt-0">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Mobile Search Button - navigates to browse page */}
        <Button
          variant="ghost"
          size="icon-lg"
          className="md:hidden bg-card border-4 border-border hover:bg-muted transition-colors"
          onClick={() => navigate({to: `/browse`})}
          aria-label="Search games"
        >
          <Search className="w-5 h-5 text-foreground" />
        </Button>
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => { navigate({to: `/`});}}
        >
          <span className="text-sm sm:text-2xl font-bold text-foreground tracking-tight font-alt hover:opacity-80">Checkpointer</span>
        </div>

        

        {/* Search Component and Logic - Desktop only */}
        <div className="flex-1 max-w-lg relative hidden md:block text-foreground">
          <Input
            type="text"
            placeholder="Search games..."
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input border-4 border-border text-foreground py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-border text-sm rounded-none"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          {/* Search Dropdown */}
          {debouncedSearchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden max-h-64 overflow-y-auto z-50">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Searching...</div>
              ) : isError ? (
                <div className="p-4 text-center text-rose-600 text-sm">Error searching games. Please try again.</div>
              ) : games.length > 0 ? (
                games.map(game => {
                  const year = formatYear(game.releaseDate);
                  return (
                    <div
                      key={game.id}
                      onClick={() => handleGameClick(game.id)}
                      className="flex items-center justify-start gap-3 p-3 hover:bg-primary/20 border-b-2 border-border/30 last:border-b-0 cursor-pointer transition-colors"
                    >
                      {game.coverUrl ? (
                        <img
                          className='w-10 h-10 object-cover border-2 border-border'
                          src={game.coverUrl}
                          alt={game.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className='w-10 h-10 bg-muted border-2 border-border flex items-center justify-center'>
                          <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col justify-start line-clamp-1 items-start flex-1 min-w-0">
                        <div className="text-foreground text-sm font-semibold truncate w-full">{game.name}</div>
                        {year && <div className="text-muted-foreground text-xs">{year}</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">No games found.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {isAdmin && (
            <Button
              variant="ghost"
              className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-colors"
              onClick={() => { navigate({to: `/admin`});}}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Button>
          )}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none cursor-pointer">
                {/* Mobile: icon only */}
                <div className="md:hidden flex items-center justify-center w-10 h-10 bg-card border-4 border-border hover:bg-muted transition-colors">
                  <ChevronDown className="w-5 h-5 text-foreground" />
                </div>
                {/* Desktop: full button with text */}
                <div className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-colors">
                  <User className="w-4 h-4" />
                  <span>Account</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] rounded-none">
                <DropdownMenuItem
                  onClick={() => navigate({to: `/profile`})}
                  className="font-medium rounded-none hover:bg-primary/20"
                >
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                {isAdmin && <DropdownMenuItem
                  onClick={() => navigate({to: `/admin`})}
                  className="font-medium rounded-none hover:bg-primary/20"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </DropdownMenuItem>}
                {isAdmin && <DropdownMenuSeparator className="bg-border/50" />}
                {settings.darkModeEnabled && (
                  <DropdownMenuItem
                    onClick={() => { const newTheme = theme === 'dark' ? 'light' : 'dark'; posthog.capture('dark_mode_toggled', { new_theme: newTheme }); setTheme(newTheme); }}
                    className="font-medium rounded-none hover:bg-primary/20"
                  >
                    <Sun className="w-4 h-4 hidden dark:block" />
                    <Moon className="w-4 h-4 dark:hidden" />
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem asChild variant="destructive" className="font-medium rounded-none">
                  <a href="/api/logout">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* Mobile: icon only */}
              <a
                href="/api/login"
                className="md:hidden flex items-center justify-center w-10 h-10 bg-card border-4 border-border hover:bg-muted transition-colors"
                aria-label="Login or Sign Up"
              >
                <LogIn className="w-5 h-5 text-foreground" />
              </a>
              {/* Desktop: full link with text */}
              <a
                href="/api/login"
                className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </a>
              <a
                href="/api/register"
                className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-colors"
              >
                <Signature className="w-4 h-4" />
                <span>Sign Up</span>
              </a>
            </>
          )}
          {/* Log Game button - desktop only */}
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 bg-card hover:bg-muted text-foreground border-4 border-border px-4 py-2 font-semibold transition-all text-sm"
            onClick={() => { posthog.capture('log_game_modal_opened', { source: 'navbar' }); setLogGameModalOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            <span>Log Game</span>
          </Button>
        </div>
      </div>

      {/* Log Game Modal */}
      <LogGameModal open={logGameModalOpen} onOpenChange={setLogGameModalOpen} />
    </nav>
    );
}

export default Navbar;
