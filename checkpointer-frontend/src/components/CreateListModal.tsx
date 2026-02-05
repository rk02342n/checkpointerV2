import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Globe, ImagePlus, X } from "lucide-react";
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
import { createList, uploadListCover, type GameListVisibility } from "@/lib/gameListsQuery";
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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // First create the list
      const result = await createList({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });

      // If there's a cover file, upload it
      if (coverFile && result.list?.id) {
        await uploadListCover(result.list.id, coverFile);
      }

      return result;
    },
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
    setCoverFile(null);
    setCoverPreview(null);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use jpeg, png, webp, or gif.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max size is 5MB.");
      return;
    }

    setCoverFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent
        className="bg-white border-4 border-stone-900 shadow-[4px_4px_0px_0px_rgba(41,37,36,1)] rounded-none w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto"
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

          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-stone-900 font-semibold text-sm">
              Cover Image (optional)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full aspect-[16/9] object-cover border-4 border-stone-900"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute top-2 right-2 p-1 bg-stone-900 text-white hover:bg-stone-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[16/9] border-4 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <ImagePlus className="w-8 h-8 text-stone-400" />
                <span className="text-sm text-stone-600">Click to upload cover image</span>
              </button>
            )}
            <p className="text-xs text-stone-500">
              Recommended: 16:9 aspect ratio. Max 5MB.
            </p>
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
