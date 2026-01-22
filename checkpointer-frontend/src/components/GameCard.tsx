import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Game } from "@/lib/gameQuery";

type GameCardProps = {
  size?: "sm" | "md" | "lg" | "xl",
  game: Game
};

const sizeClasses: Record<NonNullable<GameCardProps["size"]>, string> = {
  sm: "max-w-xs",
  md: "max-w-sm",
  lg: "max-w-md",
  xl: "max-w-lg",
};

export function GameCard({ size = "md", game}: GameCardProps) {
  return (
    <Card className={`relative mx-auto w-full pt-0${sizeClasses[size]}`}>
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={game.coverUrl!}
        alt={game.name}
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">Featured</Badge>
        </CardAction>
        <CardTitle>Design systems meetup</CardTitle>
        {/* <CardDescription>
          A practical talk on component APIs, accessibility, and shipping
          faster.
        </CardDescription> */}
      </CardHeader>
      {/* <CardFooter>
        <Button className="w-full">View Event</Button>
      </CardFooter> */}
    </Card>
  );
}
