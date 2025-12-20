"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
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

// Convert aspect ratio string to CSS aspect-ratio value
function getAspectRatioStyle(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case "16:9":
      return "16/9";
    case "9:16":
      return "9/16";
    case "4:3":
      return "4/3";
    case "3:4":
      return "3/4";
    case "1:1":
    default:
      return "1/1";
  }
}

interface ImageCardProps {
  image: ImageOperation;
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  onSelect?: (selected: boolean) => void;
}

export function ImageCard({
  image,
  selected = false,
  selectable = false,
  onClick,
  onSelect,
}: ImageCardProps) {
  const isPending = image.status === "pending";
  const isFailed = image.status === "failed";
  const badge = OPERATION_BADGES[image.operationType as OperationType];
  const aspectRatioStyle = getAspectRatioStyle(image.aspectRatio);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg overflow-hidden bg-muted cursor-pointer transition-all",
        "hover:ring-2 hover:ring-primary/50",
        selected && "ring-2 ring-primary",
        isFailed && "opacity-50"
      )}
      style={{ aspectRatio: aspectRatioStyle }}
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
          className="object-cover transition-transform group-hover:scale-105"
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
      {selectable && (
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
      )}

      {/* Hover overlay with quick info */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {image.prompt && (
          <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
        )}
      </div>
    </div>
  );
}

export function ImageCardSkeleton() {
  return (
    <div className="aspect-square rounded-lg overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}
