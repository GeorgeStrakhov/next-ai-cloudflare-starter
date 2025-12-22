"use client";

import * as React from "react";
import Image from "next/image";
import type { ImageGenToolType, ImageModel, IMAGE_MODELS } from "./tool";
import { Loader } from "@/components/loader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IconDownload, IconPhoto, IconMaximize } from "@tabler/icons-react";

const MODEL_LABELS: Record<ImageModel, string> = {
  "flux-schnell": "FLUX Schnell",
  "flux-2-pro": "FLUX 2 Pro",
  "imagen-4-ultra": "Imagen 4 Ultra",
  "nano-banana-pro": "Nano Banana Pro",
};

export function ImageGenCard({ invocation }: { invocation: ImageGenToolType }) {
  const part = invocation;
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const cardBaseClass =
    "not-prose flex w-full flex-col gap-0 overflow-hidden border border-border/50 bg-background/95 py-0 text-foreground shadow-sm";
  const headerBaseClass =
    "flex flex-col gap-2 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between";
  const contentBaseClass = "px-5 py-4";

  const renderHeader = (
    title: React.ReactNode,
    description?: React.ReactNode,
    actions?: React.ReactNode
  ) => {
    const descriptionNode =
      typeof description === "string" ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : (
        (description ?? null)
      );

    return (
      <CardHeader className={headerBaseClass}>
        {(title || descriptionNode) && (
          <div className="min-w-0 flex-1 space-y-1">
            {title ? (
              <h3 className="text-sm font-semibold leading-none tracking-tight text-foreground">
                {title}
              </h3>
            ) : null}
            {descriptionNode}
          </div>
        )}
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </CardHeader>
    );
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      // Use our proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/images/download?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Create filename from prompt (first 30 chars, sanitized)
      const safeName = prompt
        .slice(0, 30)
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
      a.download = `${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Handle tool invocation states
  if (part.state === "input-streaming") {
    return (
      <Card className={cn(cardBaseClass, "max-w-md animate-in fade-in-50")}>
        {renderHeader(
          <span className="flex items-center gap-2">
            <IconPhoto className="h-4 w-4" />
            Image Generation
          </span>,
          "Waiting for input..."
        )}
        <CardContent className={cn(contentBaseClass, "space-y-3")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader /> Preparing request
          </div>
          <Skeleton className="aspect-square w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (part.state === "input-available") {
    const model = part.input?.model || "flux-schnell";
    const modelLabel = MODEL_LABELS[model] || model;

    return (
      <Card className={cn(cardBaseClass, "max-w-md animate-in fade-in-50")}>
        {renderHeader(
          <span className="flex items-center gap-2">
            <IconPhoto className="h-4 w-4" />
            Image Generation
          </span>,
          "Generating image...",
          <Badge variant="secondary" className="text-xs">
            {modelLabel}
          </Badge>
        )}
        <CardContent className={cn(contentBaseClass, "space-y-3")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader /> Generating with {modelLabel}...
          </div>
          {part.input?.prompt ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              &ldquo;{part.input.prompt}&rdquo;
            </p>
          ) : null}
          <Skeleton className="aspect-square w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (part.state === "output-error") {
    return (
      <Card className={cn(cardBaseClass, "max-w-md animate-in fade-in-50")}>
        {renderHeader(
          <span className="flex items-center gap-2">
            <IconPhoto className="h-4 w-4" />
            Image Generation
          </span>,
          "Failed to generate"
        )}
        <CardContent className={contentBaseClass}>
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {part.errorText || "An error occurred while generating the image."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (part.output === undefined) return null;

  const { imageUrl, model, aspectRatio, prompt } = part.output;
  const modelLabel = MODEL_LABELS[model as ImageModel] || model;

  // Calculate dimensions based on aspect ratio (base width 400px)
  const getDimensions = (ratio: string): { width: number; height: number } => {
    const baseWidth = 400;
    switch (ratio) {
      case "16:9":
        return { width: baseWidth, height: Math.round(baseWidth * 9 / 16) };
      case "9:16":
        return { width: baseWidth, height: Math.round(baseWidth * 16 / 9) };
      case "4:3":
        return { width: baseWidth, height: Math.round(baseWidth * 3 / 4) };
      case "3:4":
        return { width: baseWidth, height: Math.round(baseWidth * 4 / 3) };
      case "1:1":
      default:
        return { width: baseWidth, height: baseWidth };
    }
  };

  const dimensions = getDimensions(aspectRatio);

  return (
    <>
      <Card className={cn(cardBaseClass, "max-w-md animate-in fade-in-50")}>
        {renderHeader(
          <span className="flex items-center gap-2">
            <IconPhoto className="h-4 w-4" />
            Generated Image
          </span>,
          <span className="line-clamp-1">&ldquo;{prompt}&rdquo;</span>,
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {modelLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {aspectRatio}
            </Badge>
          </div>
        )}
        <CardContent className={cn(contentBaseClass, "space-y-3")}>
          <div className="relative w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30">
            <Image
              src={imageUrl}
              alt={prompt}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full h-auto object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
            />
            {/* Overlay buttons */}
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => setIsFullscreen(true)}
              >
                <IconMaximize className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => handleDownload(imageUrl, prompt)}
              >
                <IconDownload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={imageUrl}
              alt={prompt}
              width={1024}
              height={1024}
              className="max-h-[90vh] w-auto rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(imageUrl, prompt);
                }}
              >
                <IconDownload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
