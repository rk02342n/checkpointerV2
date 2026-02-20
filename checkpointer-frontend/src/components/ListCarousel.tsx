
import { useState, useEffect, useCallback } from "react";
import { type PopularGameListSummary, getListCoverUrl } from "@/lib/gameListsQuery";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@tanstack/react-router"

const AUTO_ADVANCE_MS = 4000;

export function ListCarousel({ gameList }: { gameList: PopularGameListSummary[] }) {
    const [activeTab, setActiveTab] = useState("0");

    const advance = useCallback(() => {
        setActiveTab((prev) => String((Number(prev) + 1) % gameList.length));
    }, [gameList.length]);

    useEffect(() => {
        const interval = setInterval(advance, AUTO_ADVANCE_MS);
        return () => clearInterval(interval);
    }, [advance, activeTab]);

    if (!gameList.length) return null;

    return(
        <div className="mb-10 w-full text-foreground mt-12">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="relative overflow-hidden" style={{ marginLeft: "calc(-50vw + 50%)", width: "100vw" }}>
                    <TabsList className="absolute top-4 right-4 z-10">
                        {gameList.map((list, index) => (
                            <TabsTrigger key={list.id} value={String(index)}>
                                {index + 1}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {gameList.map((list, index) => {
                        const isActive = activeTab === String(index);
                        return (
                            <div
                                key={list.id}
                                className={`transition-opacity duration-500 ease-in-out ${isActive ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"}`}
                            >
                                {list.coverUrl && (
                                    <Link to="/lists/$listId" params={{ listId: list.id }}>
                                        <img
                                            src={getListCoverUrl(list.id)}
                                            alt={list.name}
                                            className="object-cover aspect-square sm:aspect-30/9 w-full border-border border-4"
                                            loading="lazy"
                                        />
                                        
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                    {/* Info card pinned to the right */}
                    <div className={`absolute bottom-2 max-h-4/5 right-2 w-40 sm:bottom-4 sm:right-4 sm:w-72 bg-background/70 backdrop-blur-sm border-2 sm:border-4 border-border p-2 sm:p-4 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] dark:shadow-[4px_4px_0px_0px_rgba(120,113,108,0.5)] overflow-hidden`}>
                        <h3 className="hidden sm:block text-xs text-muted-foreground truncate text-end mb-6">
                            Lists in feature
                        </h3>
                        <h3 className="text-sm sm:text-lg font-bold font-alt truncate">
                            {gameList[Number(activeTab)].name}
                        </h3>
                        {gameList[Number(activeTab)].description && (
                            <p className="hidden sm:block text-sm text-foreground/70 mt-1 line-clamp-2">
                                {gameList[Number(activeTab)].description}
                            </p>
                        )}
                        <div className="hidden sm:flex items-center justify-between mt-3 text-xs text-foreground/60">
                            <Link to="/users/$userId" params={{ userId: gameList[Number(activeTab)].ownerId }} className="hover:underline">by @{gameList[Number(activeTab)].ownerUsername}</Link>
                            <span>{gameList[Number(activeTab)].gameCount} games</span>
                        </div>
                    </div>
                    
                </div>
                
            </Tabs>
        </div>
    )
}
