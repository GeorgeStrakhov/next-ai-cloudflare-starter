"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageOperation, OperationType } from "@/db/schema/image-operations";
import { getTransformedImageUrl } from "@/lib/services/s3";

const OPERATION_BADGES: Record<
  OperationType,
  { label: string; icon: string; variant: "default" | "secondary" | "outline" }
> = {
  generate: { label: "Generated", icon: "🎨", variant: "default" },
  edit: { label: "Edited", icon: "✏️", variant: "secondary" },
  remove_bg: { label: "BG Removed", icon: "✂️", variant: "secondary" },
  upscale: { label: "Upscaled", icon: "⬆️", variant: "secondary" },
  upload: { label: "Uploaded", icon: "📤", variant: "outline" },
};

// Convert aspect ratio string to CSS value
function getAspectRatio(aspectRatio: string | null): string {
  if (!aspectRatio) return "1 / 1";
  return aspectRatio.replace(":", " / ");
}

interface ImageCardProps {
  image: ImageOperation;
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  onSelect?: (selected: boolean) => void;
  onToggleFavorite?: (image: ImageOperation) => void;
  onDelete?: (image: ImageOperation) => void;
}

export function ImageCard({
  image,
  selected = false,
  selectable = false,
  onClick,
  onSelect,
  onToggleFavorite,
  onDelete,
}: ImageCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPending = image.status === "pending";
  const isFailed = image.status === "failed";
  const badge = OPERATION_BADGES[image.operationType as OperationType];
  const aspectRatio = getAspectRatio(image.aspectRatio);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(image);
      setShowDeleteDialog(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    // Don't allow clicks on pending or failed images
    if (isPending || isFailed) return;

    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg overflow-hidden bg-muted transition-all",
          isPending || isFailed ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-primary/50",
          selected && "ring-2 ring-primary",
          isFailed && "opacity-50"
        )}
        style={{ aspectRatio }}
        onClick={handleClick}
      >
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-sm text-destructive">Failed</span>
          </div>
        ) : (
          <Image
            src={getTransformedImageUrl(image.outputUrl)}
            alt={image.prompt || "Image"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}

        {/* Badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant={badge.variant} className="text-xs">
            <span className="mr-1">{badge.icon}</span>
            {badge.label}
          </Badge>
        </div>

        {/* Selection checkbox for multi-select */}
        {selectable ? (
          <div
            className={cn(
              "absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              selected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background/80 border-muted-foreground/50"
            )}
          >
            {selected && <span className="text-xs">✓</span>}
          </div>
        ) : (
          /* Favorite heart icon */
          image.status === "completed" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(image);
              }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  image.favorite
                    ? "fill-white text-white"
                    : "text-white/70 hover:text-white"
                )}
              />
            </button>
          )
        )}

        {/* Delete button - bottom right, always visible */}
        {!selectable && image.status === "completed" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="absolute bottom-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
          >
            <Trash2 className="h-4 w-4 text-white/70 hover:text-white" />
          </button>
        )}

        {/* Hover overlay with quick info */}
        <div className="absolute inset-x-0 bottom-0 pr-10 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {image.prompt && (
            <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog - outside the card to prevent click propagation issues */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ImageCardSkeleton() {
  return (
    <div className="aspect-square rounded-lg overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}
