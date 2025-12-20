"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Copy,
  Pencil,
  Scissors,
  ArrowUpCircle,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ImageOperation, OperationType } from "@/db/schema/image-operations";
import { getTransformedImageUrl } from "@/lib/services/s3";

const OPERATION_LABELS: Record<OperationType, string> = {
  generate: "Generated",
  edit: "Edited",
  remove_bg: "Background Removed",
  upscale: "Upscaled",
  upload: "Uploaded",
};

interface ImageDetailSheetProps {
  image: ImageOperation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (image: ImageOperation) => void;
  onRemoveBg?: (image: ImageOperation) => void;
  onUpscale?: (image: ImageOperation) => void;
  onDelete?: (image: ImageOperation) => void;
}

export function ImageDetailSheet({
  image,
  open,
  onOpenChange,
  onEdit,
  onRemoveBg,
  onUpscale,
  onDelete,
}: ImageDetailSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!image) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.outputUrl);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(image);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date | number | string | null | undefined) => {
    if (!date) return "Unknown";

    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === "number") {
      dateObj = new Date(date);
    } else if (typeof date === "string") {
      // Handle ISO string or numeric string
      const parsed = Date.parse(date);
      if (isNaN(parsed)) return "Unknown";
      dateObj = new Date(parsed);
    } else {
      return "Unknown";
    }

    if (isNaN(dateObj.getTime())) return "Unknown";

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dateObj);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-6 flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span>{OPERATION_LABELS[image.operationType as OperationType]}</span>
              <Badge
                variant={image.status === "completed" ? "default" : "destructive"}
              >
                {image.status}
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Image details and actions
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
            {/* Image preview - grows to fill available space, but always visible */}
            <div className="relative flex-1 min-h-32 w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <Image
                src={getTransformedImageUrl(image.outputUrl)}
                alt={image.prompt || "Image"}
                width={800}
                height={800}
                priority
                className="object-contain max-w-full max-h-full"
                sizes="(max-width: 640px) 100vw, 500px"
              />
            </div>

            {/* Content area - scrollable if long prompt */}
            <div className="flex-shrink-0 space-y-4 max-h-[25vh] overflow-y-auto">
              {/* URL copy */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">CDN URL</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={image.outputUrl}
                    readOnly
                    className="flex-1 text-xs bg-muted border rounded px-2 py-1.5 truncate"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyUrl}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(image.outputUrl, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {image.model && (
                    <>
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium text-right">{image.model}</span>
                    </>
                  )}
                  {image.aspectRatio && (
                    <>
                      <span className="text-muted-foreground">Aspect Ratio</span>
                      <span className="font-medium text-right">{image.aspectRatio}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium text-right">{formatFileSize(image.outputSize)}</span>
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-right">{formatDate(image.createdAt)}</span>
                </div>

                {image.prompt && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Prompt</p>
                    <p className="text-sm">{image.prompt}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - always visible at bottom */}
            {image.status === "completed" && (
              <div className="flex-shrink-0 space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(image)}
                    className="justify-start"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveBg?.(image)}
                    className="justify-start"
                  >
                    <Scissors className="h-4 w-4 mr-2" />
                    Remove BG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpscale?.(image)}
                    className="justify-start"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Upscale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
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
