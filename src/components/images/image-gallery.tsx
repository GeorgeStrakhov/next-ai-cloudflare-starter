"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Pencil, Loader2, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { PromptBar } from "./prompt-bar";
import { ImageCard, ImageCardSkeleton } from "./image-card";
import { ImageDetailSheet } from "./image-detail-sheet";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import { useSidebar } from "@/components/ui/sidebar";
import { EditDialog } from "./edit-dialog";
import { UploadDialog } from "./upload-dialog";
import type { ImageOperation, OperationType } from "@/db/schema/image-operations";

type FilterType = "all" | OperationType;

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function ImageGallery() {
  const { open: sidebarOpen } = useSidebar();
  const isFirstRender = useRef(true);

  // Trigger resize after sidebar animation completes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Wait for sidebar animation (~300ms) then trigger resize
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 350);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  const [images, setImages] = useState<ImageOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Selection and detail view
  const [selectedImage, setSelectedImage] = useState<ImageOperation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<ImageOperation[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Fetch images
  const fetchImages = useCallback(
    async (page = 1, append = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (filter !== "all") {
          params.set("filter", filter);
        }
        if (favoritesOnly) {
          params.set("favorites", "true");
        }

        const response = await fetch(`/api/images?${params}`);
        if (!response.ok) throw new Error("Failed to fetch images");

        const data: { images: ImageOperation[]; pagination: PaginationData } = await response.json();

        if (append) {
          setImages((prev) => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }
        setPagination(data.pagination);
      } catch (error) {
        toast.error("Failed to load images");
        console.error(error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filter, favoritesOnly]
  );

  // Load more handler
  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchImages(pagination.page + 1, true);
    }
  };

  // Poll for pending images
  useEffect(() => {
    if (pendingIds.size === 0) return;

    // Capture the IDs to poll at the time the effect runs
    const idsToCheck = Array.from(pendingIds);

    const interval = setInterval(async () => {
      const completedIds: string[] = [];

      for (const id of idsToCheck) {
        try {
          const response = await fetch(`/api/images/${id}`);
          if (response.ok) {
            const data: { image: ImageOperation } = await response.json();
            const image = data.image;

            if (image.status !== "pending") {
              completedIds.push(id);

              // Update the image in state
              setImages((prev) =>
                prev.map((img) => (img.id === id ? image : img))
              );

              if (image.status === "completed") {
                toast.success("Image ready!");
              } else if (image.status === "failed") {
                toast.error(image.errorMessage || "Operation failed");
              }
            }
          }
        } catch (error) {
          console.error(`Failed to poll image ${id}:`, error);
          // Keep polling on error
        }
      }

      // Only remove completed IDs, preserve any newly added ones
      if (completedIds.length > 0) {
        setPendingIds((current) => {
          const updated = new Set(current);
          for (const id of completedIds) {
            updated.delete(id);
          }
          return updated;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pendingIds]);

  // Initial fetch
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Handlers
  const handleGenerate = async (data: {
    prompt: string;
    model: string;
    aspectRatio: string;
  }) => {
    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: { error?: string } = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const result: { image: ImageOperation } = await response.json();
      const newImage = result.image;

      // Add to beginning of list
      setImages((prev) => [newImage, ...prev]);

      // Track if pending
      if (newImage.status === "pending") {
        setPendingIds((prev) => new Set([...prev, newImage.id]));
        toast.success("Generation started...");
      } else {
        toast.success("Image generated!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/images", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error: { error?: string } = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result: { image: ImageOperation } = await response.json();
    setImages((prev) => [result.image, ...prev]);
    toast.success("Image uploaded!");
  };

  const handleEdit = async (data: {
    prompt: string;
    imageIds: string[];
    model: string;
    aspectRatio: string;
  }) => {
    const response = await fetch("/api/images/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: { error?: string } = await response.json();
      throw new Error(error.error || "Edit failed");
    }

    const result: { image: ImageOperation } = await response.json();
    const newImage = result.image;

    setImages((prev) => [newImage, ...prev]);

    if (newImage.status === "pending") {
      setPendingIds((prev) => new Set([...prev, newImage.id]));
      toast.success("Edit started...");
    } else {
      toast.success("Image edited!");
    }

    setSelectedForEdit([]);
    setIsSelectMode(false);
  };

  const handleRemoveBg = async (image: ImageOperation) => {
    setDetailOpen(false);

    try {
      const response = await fetch("/api/images/remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      });

      if (!response.ok) {
        const error: { error?: string } = await response.json();
        throw new Error(error.error || "Background removal failed");
      }

      const result: { image: ImageOperation } = await response.json();
      const newImage = result.image;

      setImages((prev) => [newImage, ...prev]);

      if (newImage.status === "pending") {
        setPendingIds((prev) => new Set([...prev, newImage.id]));
        toast.success("Background removal started...");
      } else {
        toast.success("Background removed!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Background removal failed");
    }
  };

  const handleUpscale = async (image: ImageOperation) => {
    setDetailOpen(false);

    try {
      const response = await fetch("/api/images/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      });

      if (!response.ok) {
        const error: { error?: string } = await response.json();
        throw new Error(error.error || "Upscale failed");
      }

      const result: { image: ImageOperation } = await response.json();
      const newImage = result.image;

      setImages((prev) => [newImage, ...prev]);

      if (newImage.status === "pending") {
        setPendingIds((prev) => new Set([...prev, newImage.id]));
        toast.success("Upscaling started...");
      } else {
        toast.success("Image upscaled!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upscale failed");
    }
  };

  const handleDelete = async (image: ImageOperation) => {
    const response = await fetch(`/api/images/${image.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error: { error?: string } = await response.json();
      throw new Error(error.error || "Delete failed");
    }

    setImages((prev) => prev.filter((img) => img.id !== image.id));
    toast.success("Image deleted");
  };

  const handleToggleFavorite = async (image: ImageOperation) => {
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }

      const result: { favorite: boolean } = await response.json();

      // Update the image in state
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, favorite: result.favorite } : img
        )
      );
    } catch (error) {
      toast.error("Failed to update favorite");
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForEdit.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedForEdit.map((img) => img.id) }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete images");
      }

      const result: { deleted: number } = await response.json();

      // Remove deleted images from state
      const deletedIds = new Set(selectedForEdit.map((img) => img.id));
      setImages((prev) => prev.filter((img) => !deletedIds.has(img.id)));

      toast.success(`Deleted ${result.deleted} image${result.deleted > 1 ? "s" : ""}`);
      setSelectedForEdit([]);
      setIsSelectMode(false);
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error("Failed to delete images");
      console.error(error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleImageClick = (image: ImageOperation) => {
    if (isSelectMode) {
      const isSelected = selectedForEdit.some((img) => img.id === image.id);
      if (isSelected) {
        setSelectedForEdit((prev) => prev.filter((img) => img.id !== image.id));
      } else {
        setSelectedForEdit((prev) => [...prev, image]);
      }
    } else {
      setSelectedImage(image);
      setDetailOpen(true);
    }
  };

  const handleStartEdit = (image: ImageOperation) => {
    setDetailOpen(false);
    setSelectedForEdit([image]);
    setIsSelectMode(true);
    setEditOpen(true);
  };

  const handleOpenEditFromSelection = () => {
    if (selectedForEdit.length === 0) {
      toast.error("Select at least one image to edit");
      return;
    }
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Prompt bar */}
      <PromptBar onGenerate={handleGenerate} />

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Images</SelectItem>
                <SelectItem value="generate">Generated</SelectItem>
                <SelectItem value="edit">Edited</SelectItem>
                <SelectItem value="remove_bg">BG Removed</SelectItem>
                <SelectItem value="upscale">Upscaled</SelectItem>
                <SelectItem value="upload">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Heart
              className={`h-4 w-4 mr-1 ${favoritesOnly ? "fill-current" : ""}`}
            />
            Favorites
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {!isSelectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          )}

          {isSelectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedForEdit([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleOpenEditFromSelection}
                disabled={selectedForEdit.length === 0}
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit</span>
                <span className="ml-1">({selectedForEdit.length})</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={selectedForEdit.length === 0}
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
                <span className="ml-1">({selectedForEdit.length})</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectMode(true)}
              disabled={images.length === 0}
            >
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Select</span>
            </Button>
          )}
        </div>
      </div>

      {/* Pending indicator */}
      {pendingIds.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {pendingIds.size} operation{pendingIds.size > 1 ? "s" : ""} in progress...
          </span>
        </div>
      )}

      {/* Gallery - Masonry layout with linear ordering (newest first, left-to-right) */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <ImageCardSkeleton key={i} />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No images yet.</p>
          <p className="text-sm mt-1">Enter a prompt above to generate your first image!</p>
        </div>
      ) : (
        <Masonry
          columnWidth={200}
          gap={16}
          maxColumnCount={5}
          linear={true}
          itemHeight={200}
          overscan={10}
          resetKey={`${images[0]?.id || "empty"}-${filter}-${favoritesOnly}`}
        >
          {images.map((image) => (
            <MasonryItem key={image.id}>
              <ImageCard
                image={image}
                selected={selectedForEdit.some((img) => img.id === image.id)}
                selectable={isSelectMode && image.status === "completed"}
                onClick={() => handleImageClick(image)}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            </MasonryItem>
          ))}
        </Masonry>
      )}

      {/* Load more */}
      {pagination && pagination.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${pagination.total - images.length} remaining)`
            )}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        selectedImages={selectedForEdit}
        onEdit={handleEdit}
        onRemoveImage={(id) =>
          setSelectedForEdit((prev) => prev.filter((img) => img.id !== id))
        }
      />

      <ImageDetailSheet
        image={selectedImage}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleStartEdit}
        onRemoveBg={handleRemoveBg}
        onUpscale={handleUpscale}
        onDelete={handleDelete}
      />

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedForEdit.length} Images</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedForEdit.length} image
              {selectedForEdit.length > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
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
    </div>
  );
}
