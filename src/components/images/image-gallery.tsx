"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PromptBar } from "./prompt-bar";
import { ImageCard, ImageCardSkeleton } from "./image-card";
import { ImageDetailSheet } from "./image-detail-sheet";
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
  const [images, setImages] = useState<ImageOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

        const response = await fetch(`/api/images?${params}`);
        if (!response.ok) throw new Error("Failed to fetch images");

        const data = await response.json();

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
    [filter]
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
            const data = await response.json();
            const image = data.image as ImageOperation;

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
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const result = await response.json();
      const newImage = result.image as ImageOperation;

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
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
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
      const error = await response.json();
      throw new Error(error.error || "Edit failed");
    }

    const result = await response.json();
    const newImage = result.image as ImageOperation;

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
        const error = await response.json();
        throw new Error(error.error || "Background removal failed");
      }

      const result = await response.json();
      const newImage = result.image as ImageOperation;

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
        const error = await response.json();
        throw new Error(error.error || "Upscale failed");
      }

      const result = await response.json();
      const newImage = result.image as ImageOperation;

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
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }

    setImages((prev) => prev.filter((img) => img.id !== image.id));
    toast.success("Image deleted");
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>

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
                <Pencil className="h-4 w-4 mr-2" />
                Edit ({selectedForEdit.length})
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectMode(true)}
              disabled={images.length === 0}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Select to Edit
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

      {/* Gallery - masonry layout */}
      {isLoading ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4">
              <ImageCardSkeleton />
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No images yet.</p>
          <p className="text-sm mt-1">Enter a prompt above to generate your first image!</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
          {images.map((image) => (
            <div key={image.id} className="break-inside-avoid mb-4">
              <ImageCard
                image={image}
                selected={selectedForEdit.some((img) => img.id === image.id)}
                selectable={isSelectMode && image.status === "completed"}
                onClick={() => handleImageClick(image)}
              />
            </div>
          ))}
        </div>
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
    </div>
  );
}
