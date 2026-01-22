import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useState, useEffect, type ChangeEvent } from "react";
import { StarRating } from "./StarRating";
import { Heart } from "lucide-react";
import { type Game } from "@/lib/gameQuery";
import { Button } from "./ui/button";

interface Review {
  userId: string;
  gameId: string | number;
  date_played: string;
  rating: string | number;
  liked: boolean;
  text: string;
}

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose }) => {
    const games = [
        { id: 1, name: "Elden Ring", releaseDate: '2022', dev: "FromSoftware", coverUrl: "RPG" },
        { id: 2, name: "Baldur's Gate 3", releaseDate: '2023', dev: "Larian", coverUrl: "RPG" },
        { id: 3, name: "Hollow Knight", releaseDate: '2017', dev: "Team Cherry", coverUrl: "Metroidvania"},
        { id: 4, name: "Breath of the Wild", releaseDate: '2017', dev: "Nintendo", coverUrl: "Adventure"},
        { id: 5, name: "Cyberpunk 2077", releaseDate: '2020', dev: "CDPR", coverUrl: "RPG"},
        { id: 6, name: "God of War", releaseDate: '2018', dev: "Santa Monica", coverUrl: "Action"},
        { id: 7, name: "Hades", releaseDate: '2020', dev: "Supergiant", coverUrl: "Roguelike"},
        { id: 8, name: "Stardew Valley", releaseDate: '2016', dev: "ConcernedApe", coverUrl: "Sim"},
        { id: 9, name: "The Last of Us Part II", releaseDate: '2020', dev: "Naughty Dog", coverUrl: "Action"},
        { id: 10, name: "Disco Elysium", releaseDate: '2019', dev: "ZA/UM", coverUrl: "RPG"},
        { id: 11, name: "Outer Wilds", releaseDate: '2019', dev: "Mobius", coverUrl: "Adventure"},
        { id: 12, name: "Celeste", releaseDate: '2018', dev: "EXOK", coverUrl: "Platformer"},
        { id: 13, name: "Portal 2", releaseDate: '2011', dev: "Valve", coverUrl: "Puzzle"},
        { id: 14, name: "Bloodborne", releaseDate: '2015', dev: "FromSoftware", coverUrl: "RPG"},
        { id: 15, name: "Minecraft", releaseDate: '2011', dev: "Mojang", coverUrl: "Sandbox"},
        { id: 16, name: "Persona 5 Royal", releaseDate: '2020', dev: "Atlus", coverUrl: "JRPG"},
    ];
    
    const [activeGame, setActiveGame] = useState<Game | undefined>();
    const [isGameActive, setIsGameActive] = useState<boolean>(false);
    const [filteredGames, setFilteredGames] = useState<Game[]>(games || []);
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    const [review, setReview] = useState<Review>({
        userId: 'testuser',
        gameId: '',
        date_played: (new Date(Date.now())).toISOString().slice(0, 10),
        rating: "",
        liked: false,
        text: "",
    });

    useEffect(() => {
        if (!games) return;
        setFilteredGames(games.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())));
    }, [searchQuery]);

    useEffect(() => {
        const value = isGameActive && activeGame ? activeGame.id : '';
        const name = 'gameId';
        setReview({
            ...review,
            [name]: value,
        });
    }, [isGameActive, activeGame]);

    const handleGameClick = (game: Game): void => {
        setActiveGame(game);
        setIsGameActive(true);
    };

    const handleLogGame = async (): Promise<void> => {
        try {
            // const response = await axios.post(`${API_URL}/reviews`, review);
            console.log('Success:', review);
        } catch (error) {
            console.error('Error:', error);
        }
        onClose();
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const value = event.target.value;
        const name = event.target.name;
        setReview({
            ...review,
            [name]: value,
        });
    };

    const handleLiked = (event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.checked;
        const name = event.target.name;
        setReview({
            ...review,
            [name]: value,
        });
    };

    const handleRatingChange = (rating: number): void => {
        setReview({
            ...review,
            rating: rating,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {!isGameActive ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Select a Game</DialogTitle>
                        </DialogHeader>
                        <div className="p-4">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search games..." 
                                className="w-full bg-white border-2 rounded-full p-2 mb-4 text-black border-black placeholder-zinc-500 focus:border-4"
                                onChange={(e) => {
                                    setSearchQuery(e.target.value.toLowerCase());
                                }}
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                {filteredGames.map(g => (
                                    <div 
                                        key={g.id} 
                                        onClick={() => { handleGameClick(g); }} 
                                        className="flex bg-orange-200 items-start outline-2 outline-black m-2 justify-start gap-2 p-2 hover:bg-amber-300 rounded cursor-pointer"
                                    >
                                        <span className="text-start text-sm text-black">{g.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Log Game</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-6">
                            <pre>{JSON.stringify(review, null, 3)}</pre>
                            <div className="space-y-4 border-t border-zinc-800 pt-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs uppercase font-bold text-black tracking-wider">Date Played</label>
                                    <input 
                                        name="date_played" 
                                        onChange={handleChange} 
                                        type="date" 
                                        className="bg-white text-black rounded border-2 border-black p-2 text-sm w-full outline-none focus:ring-1 focus:ring-green-500" 
                                        defaultValue={new Date().toISOString().split('T')[0]} 
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs uppercase font-bold text-black tracking-wider">Rating</label>
                                    <div className="flex flex-col items-center justify-between bg-white text-black border-2 border-black p-3 rounded-full">
                                        <div className="flex items-center gap-2 mb-3">
                                            <StarRating interactive onValueChange={handleRatingChange}/>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                name="liked" 
                                                className="hidden peer" 
                                                onChange={handleLiked} 
                                            />
                                            <Heart className="w-5 h-5 text-zinc-600 peer-checked:text-red-500 peer-checked:fill-red-500 transition-colors" />
                                            <span className="text-xs text-black group-hover:text-zinc-500">Like</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs uppercase font-bold text-black tracking-wider">Review</label>
                                    <textarea 
                                        name="text"
                                        rows={4}
                                        placeholder="Add a review..."
                                        className="w-full bg-white text-black border-2 border-black rounded p-3 text-sm resize-none outline-none focus:ring-1 focus:border-4 placeholder-zinc-600"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsGameActive(false)}
                                    className="px-4 py-2 rounded text-black hover:text-zinc-500 text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogGame}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-sm transition-colors shadow-lg shadow-green-900/20"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="pop">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LogModal;
