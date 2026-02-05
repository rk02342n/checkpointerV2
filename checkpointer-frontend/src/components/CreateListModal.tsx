import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { createList, type GameListVisibility } from "@/lib/gameListsQuery";
import { toast } from "sonner";

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (listId: string) => void;
}

export function CreateListModal({ open, onOpenChange, onSuccess }: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GameListVisibility>("public");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createList,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-game-lists"] });
      toast.success("List created!");
      resetAndClose();
      onSuccess?.(data.list.id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create list");
    },
  });

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setVisibility("public");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent
        className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none w-[calc(100%-2rem)] sm:max-w-md"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-stone-900 font-bold text-lg sm:text-xl">
            Create New List
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-stone-900 font-semibold text-sm">
              List Name *
            </Label>
            <Input
              id="list-name"
              type="text"
              placeholder="e.g., Favorite RPGs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-4 border-stone-900 text-stone-900 rounded-none focus:ring-2 focus:ring-stone-900"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-description" className="text-stone-900 font-semibold text-sm">
              Description (optional)
            </Label>
            <Textarea
              id="list-description"
              placeholder="What's this list about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white border-4 border-stone-900 text-stone-900 rounded-none focus:ring-2 focus:ring-stone-900 min-h-20"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-stone-900 font-semibold text-sm">
              Visibility
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex items-center justify-center gap-2 p-3 border-4 font-semibold text-sm transition-colors ${
                  visibility === "public"
                    ? "bg-green-200 border-stone-900 text-stone-900"
                    : "bg-white border-stone-300 text-stone-600 hover:border-stone-400"
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`flex items-center justify-center gap-2 p-3 border-4 font-semibold text-sm transition-colors ${
                  visibility === "private"
                    ? "bg-amber-200 border-stone-900 text-stone-900"
                    : "bg-white border-stone-300 text-stone-600 hover:border-stone-400"
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
            </div>
            <p className="text-xs text-stone-600">
              {visibility === "public"
                ? "Anyone can see this list"
                : "Only you can see this list"}
            </p>
          </div>

          {createMutation.error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-600 text-sm">
              {createMutation.error.message}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={createMutation.isPending}
              className="border-4 border-stone-900 rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="bg-stone-900 hover:bg-stone-800 text-white border-4 border-stone-900 rounded-none"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create List"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
