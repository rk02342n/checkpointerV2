
import { useState, useEffect, useCallback } from "react";
import { type PopularGameListSummary, getListCoverUrl } from "@/lib/gameListsQuery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from "@tanstack/react-router"

const AUTO_ADVANCE_MS = 5000;

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
        <div className="p-0 m-auto mb-10 w-full text-foreground h-full">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="ml-auto">
                    {gameList.map((list, index) => (
                        <TabsTrigger key={list.id} value={String(index)}>
                            {index + 1}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <div className="relative">
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
                                            className="object-cover aspect-21/9 w-full border-border border-4 hover:opacity-90"
                                            loading="lazy"
                                        />
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Tabs>
        </div>
    )
}
