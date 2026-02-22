import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function LoadMoreButton({ hasNextPage, isFetchingNextPage, fetchNextPage }: LoadMoreButtonProps) {
  if (!hasNextPage) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
        {isFetchingNextPage ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
}
