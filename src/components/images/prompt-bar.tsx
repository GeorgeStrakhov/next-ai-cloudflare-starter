"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";

const MODELS = [
  { value: "flux-schnell", label: "FLUX Schnell" },
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "flux-2-pro", label: "FLUX 2 Pro" },
  { value: "imagen-4-ultra", label: "Imagen 4 Ultra" },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
] as const;

interface PromptBarProps {
  onGenerate: (data: {
    prompt: string;
    model: string;
    aspectRatio: string;
  }) => void;
  disabled?: boolean;
}

export function PromptBar({ onGenerate, disabled }: PromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(MODELS[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onGenerate({ prompt: prompt.trim(), model, aspectRatio });
    // Don't clear prompt - user may want to generate variations
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (prompt.trim()) {
        onGenerate({ prompt: prompt.trim(), model, aspectRatio });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-3">
      <Textarea
        placeholder="Describe the image you want to generate..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={2}
        className="resize-none"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <Select value={model} onValueChange={setModel} disabled={disabled}>
            <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none" tabIndex={-1}>
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

          <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={disabled}>
            <SelectTrigger className="w-[80px]" tabIndex={-1}>
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

        <Button
          type="submit"
          disabled={disabled || !prompt.trim()}
          className="w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate
        </Button>
      </div>
      <p className="text-xs text-muted-foreground hidden sm:block">
        Tip: Press Cmd+Enter to generate
      </p>
    </form>
  );
}
