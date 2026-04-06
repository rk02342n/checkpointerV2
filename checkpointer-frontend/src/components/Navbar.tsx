import { Gamepad2, Search, User, Plus, Shield, LogIn, LogOut, ChevronDown, Signature, Settings } from "lucide-react";
import { usePostHog } from 'posthog-js/react'
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { getSearchGamesQueryOptions } from "@/lib/gameQuery";
import { useDebounce } from "@/lib/useDebounce";
import { type Game } from "@/lib/gameQuery";
import { dbUserQueryOptions } from "@/lib/api";
import { SearchDropdown, type SearchDropdownItem } from "./SearchDropdown";
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
  sticky?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ sticky = true }) => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [logGameModalOpen, setLogGameModalOpen] = useState(false);
    const navigate = useNavigate();
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

    const searchItems: SearchDropdownItem[] = games.map(game => ({
      id: game.id,
      name: game.name,
      imageUrl: game.coverUrl,
      secondary: formatYear(game.releaseDate)?.toString() ?? null,
    }));

    return(
      <nav className={`${sticky ? 'sticky top-0' : ''} z-40 bg-primary border-4 border-border shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] mb-0 mx-4 mt-0`}>
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
        <SearchDropdown
          query={searchQuery}
          onQueryChange={setSearchQuery}
          items={searchItems}
          isLoading={isLoading}
          isError={isError}
          onSelect={(item) => handleGameClick(item.id)}
          placeholder="Search games..."
          fallbackIcon={<Gamepad2 className="w-5 h-5 text-muted-foreground" />}
          emptyMessage="No games found."
          errorMessage="Error searching games. Please try again."
          showDropdown={!!debouncedSearchQuery}
          className="flex-1 max-w-lg hidden md:block text-foreground"
        />

        <div className="flex items-center gap-4 md:gap-6">
          <Button
              variant="ghost"
              className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-80 transition-colors"
              onClick={() => { navigate({to: `/about`});}}
            >
              <span>About</span>
            </Button>
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none cursor-pointer">
                {/* Mobile: icon only */}
                <div className="md:hidden flex items-center justify-center w-10 h-10 bg-card border-4 border-border hover:bg-muted transition-colors">
                  <ChevronDown className="w-5 h-5 text-foreground" />
                </div>
                {/* Desktop: full button with text */}
                <div className="hidden md:flex items-center gap-2 text-foreground text-xs font-bold uppercase tracking-wide hover:opacity-60 transition-colors">
                  <User className="w-4 h-4" />
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
                <DropdownMenuItem
                  onClick={() => navigate({to: `/settings`})}
                  className="font-medium rounded-none hover:bg-primary/20"
                >
                  <Settings className="w-4 h-4" />
                  Settings
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
