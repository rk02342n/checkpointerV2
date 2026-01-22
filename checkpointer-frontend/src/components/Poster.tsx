import { Eye } from 'lucide-react';

type Game = {
  id: number;
  title: string;
  year: number;
  dev?: string;
  genre?: string;
  color?: string;
  cover_image?: string;
};

type PosterProps = {
  game: Game;
  size?: "sm" | "md" | "lg" | "xl";
  showTitle?: boolean;
  onClick?: (game: Game) => void;
  className?: string;
};

const sizeClasses: Record<NonNullable<PosterProps["size"]>, string> = {
  sm: "w-16 h-24 text-[0.5rem]",
  md: "w-32 h-48 text-xs",
  lg: "w-48 h-72 text-sm",
  xl: "w-64 h-96 text-base",
};

export const Poster: React.FC<PosterProps> = ({
  game,
  size = "md",
  showTitle = false,
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={() => onClick && onClick(game)}
      className={`relative group cursor-pointer transition-transform hover:scale-105 hover:z-10 ${sizeClasses[size]} ${className}`}
    >
      <img
        className="w-full h-full object-cover"
        src={game.cover_image || ""}
        alt={game.title || "Game Poster"}
      />
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 backdrop-blur-[2px]">
        <Eye className="w-6 h-6 text-white mb-1" />
        {showTitle && 
          <span className="text-white font-bold text-center text-xs">{game.title}</span>
        }
        {showTitle && 
          <span className="text-white/70 text-[10px]">{game.year}</span>
        }
      </div>
    </div>
  );
};
