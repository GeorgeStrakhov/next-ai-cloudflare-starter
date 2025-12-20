"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ImageOperation } from "@/db/schema/image-operations";
import { getTransformedImageUrl } from "@/lib/services/s3";

const EDIT_MODELS = [
  { value: "flux-kontext", label: "FLUX Kontext (1 image)", maxImages: 1 },
  { value: "nano-banana-pro", label: "Nano Banana Pro (up to 8 images)", maxImages: 8 },
] as const;

const ASPECT_RATIOS = [
  { value: "match_input_image", label: "Match Input" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
] as const;

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImages: ImageOperation[];
  onEdit: (data: {
    prompt: string;
    imageIds: string[];
    model: string;
    aspectRatio: string;
  }) => Promise<void>;
  onRemoveImage: (imageId: string) => void;
}

export function EditDialog({
  open,
  onOpenChange,
  selectedImages,
  onEdit,
  onRemoveImage,
}: EditDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(EDIT_MODELS[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
  const [isEditing, setIsEditing] = useState(false);

  const selectedModel = EDIT_MODELS.find((m) => m.value === model);
  const maxImages = selectedModel?.maxImages || 1;
  const tooManyImages = selectedImages.length > maxImages;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error("Please enter edit instructions");
      return;
    }

    if (selectedImages.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    if (tooManyImages) {
      toast.error(`${model} supports maximum ${maxImages} image(s)`);
      return;
    }

    setIsEditing(true);
    try {
      await onEdit({
        prompt: prompt.trim(),
        imageIds: selectedImages.map((img) => img.id),
        model,
        aspectRatio,
      });
      setPrompt("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Edit failed");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Selected Images ({selectedImages.length})
              </label>
              {tooManyImages && (
                <Badge variant="destructive">
                  Max {maxImages} for {selectedModel?.label}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative w-16 h-16 rounded overflow-hidden group"
                >
                  <Image
                    src={getTransformedImageUrl(img.outputUrl)}
                    alt={img.prompt || "Image"}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    tabIndex={-1}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              {selectedImages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No images selected. Select images from the gallery first.
                </p>
              )}
            </div>
          </div>

          {/* Model and aspect ratio settings */}
          <div className="flex gap-2">
            <Select
              value={model}
              onValueChange={setModel}
              disabled={isEditing}
            >
              <SelectTrigger className="flex-1" tabIndex={-1}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDIT_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={aspectRatio}
              onValueChange={setAspectRatio}
              disabled={isEditing}
            >
              <SelectTrigger className="w-[130px]" tabIndex={-1}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ar) => (
                  <SelectItem key={ar.value} value={ar.value}>
                    {ar.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Edit instructions */}
          <Textarea
            placeholder="Describe how you want to edit the image(s)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isEditing}
            rows={3}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex flex-row-reverse justify-start gap-2">
            <Button
              type="submit"
              disabled={
                isEditing ||
                !prompt.trim() ||
                selectedImages.length === 0 ||
                tooManyImages
              }
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                "Edit"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
