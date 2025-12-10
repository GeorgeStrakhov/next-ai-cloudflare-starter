"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";
import Image from "next/image";
import { getTransformedImageUrl } from "@/lib/services/s3";
import { toast } from "sonner";

interface GeneratedImage {
  url: string;
  key: string;
  size: number;
  prompt: string;
}

const MODELS = [
  { value: "imagen-4-ultra", label: "Google Imagen 4 Ultra" },
  { value: "flux-pro-1-1", label: "FLUX 1.1 Pro" },
  { value: "flux-schnell", label: "FLUX Schnell" },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Standard (4:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
] as const;

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(MODELS[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy URL");
    }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Generation failed");
      }

      const data = (await response.json()) as { image: GeneratedImage };
      setGeneratedImage(data.image);
      setPrompt(""); // Clear prompt after successful generation
      toast.success("Image generated successfully!");
    } catch (err) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Generation failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={model} onValueChange={setModel} disabled={generating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aspect Ratio</label>
              <Select
                value={aspectRatio}
                onValueChange={setAspectRatio}
                disabled={generating}
              >
                <SelectTrigger>
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
          </div>

          <div>
            <Textarea
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Image"
            )}
          </Button>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Generated image */}
      {generatedImage && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Generated Image</h3>
          <div className="space-y-3 border rounded-lg p-4">
            <div className="relative w-full aspect-square max-w-xl mx-auto">
              <Image
                src={getTransformedImageUrl(generatedImage.url)}
                alt={generatedImage.prompt}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Prompt:</p>
              <p className="text-sm text-gray-600">{generatedImage.prompt}</p>
            </div>
            <p className="text-xs text-gray-400">
              Size: {(generatedImage.size / 1024).toFixed(2)} KB
            </p>
            <div className="pt-2 space-y-2">
              <p className="text-xs font-medium text-gray-700">CDN URL:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedImage.url}
                  readOnly
                  className="text-xs bg-gray-50 border rounded px-2 py-1.5 flex-1 truncate"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedImage.url)}
                  className="shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
