import { type Game } from '@/lib/gameQuery';

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
  onClick,
  className = "",
}) => {
  return (
    <div
      onClick={() => onClick && onClick(game)}
      className={`relative group cursor-pointer transition-transform hover:scale-105 hover:z-10 outline-black border-black hover:border-2 ${sizeClasses[size]} ${className}`}
    >
      <img
        className="w-full h-full object-cover rounded-md"
        src={game.coverUrl || ""}
        alt={game.name || "Game Poster"}
      />
    </div>
  );
};
