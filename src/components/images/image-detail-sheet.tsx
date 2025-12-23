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
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
        <SheetContent className="w-full sm:max-w-lg lg:max-w-4xl xl:max-w-5xl p-0 flex flex-col lg:overflow-hidden overflow-y-auto">
          <div className="flex flex-col lg:flex-row lg:h-full">
            {/* Image preview - side by side on desktop, top/bottom on mobile */}
            <div className="relative aspect-square sm:aspect-video lg:aspect-auto lg:h-full lg:flex-1 bg-muted/30 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r shrink-0">
              <div className="absolute inset-0 lg:inset-4 flex items-center justify-center p-2 lg:p-0">
                <Image
                  src={getTransformedImageUrl(image.outputUrl)}
                  alt={image.prompt || "Image"}
                  width={1200}
                  height={1200}
                  priority
                  className="object-contain max-w-full max-h-full drop-shadow-2xl p-4"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </div>
            </div>

            {/* Details panel */}
            <div className="w-full lg:w-80 xl:w-96 flex flex-col lg:h-full bg-background">
              <SheetHeader className="p-6 border-b shrink-0">
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

              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                {/* URL copy */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">CDN URL</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={image.outputUrl}
                      readOnly
                      className="flex-1 text-xs bg-muted/50 border rounded-md px-3 py-2 truncate transition-colors focus:bg-background"
                    />
                    <Button size="icon" variant="outline" onClick={handleCopyUrl} className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(image.outputUrl, "_blank")}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Metadata</p>
                  <div className="grid gap-3">
                    {image.model && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium bg-muted/50 px-2 py-0.5 rounded text-xs">{image.model}</span>
                      </div>
                    )}
                    {image.aspectRatio && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Aspect Ratio</span>
                        <span className="font-medium">{image.aspectRatio}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">File Size</span>
                      <span className="font-medium">{formatFileSize(image.outputSize)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(image.createdAt)}</span>
                    </div>
                    {image.chatId && (
                      <div className="flex justify-between items-center text-sm pt-1 border-t">
                        <span className="text-muted-foreground">Source</span>
                        <Link
                          href={`/dashboard/chat/${image.chatId}`}
                          className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          View in chat
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prompt */}
                {image.prompt && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Prompt</p>
                    <div className="text-sm bg-muted/30 p-3 rounded-md border text-foreground/90 leading-relaxed">
                      {image.prompt}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions sticky at bottom */}
              {image.status === "completed" && (
                <div className="p-6 border-t bg-muted/10 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(image)}
                      className="justify-center h-10"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveBg?.(image)}
                      className="justify-center h-10"
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Remove BG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpscale?.(image)}
                      className="justify-center h-10"
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Upscale
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="justify-center h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
