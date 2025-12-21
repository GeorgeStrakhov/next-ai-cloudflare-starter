import { tool } from "ai";
import { z } from "zod";
import { generateImage } from "@/lib/services/replicate";

// Default model - easy to change
export const DEFAULT_IMAGE_MODEL = "flux-schnell";

// Available models for image generation
export const IMAGE_MODELS = {
  "flux-schnell": {
    name: "FLUX Schnell",
    description: "Fast generation (~2s), good quality",
  },
  "flux-2-pro": {
    name: "FLUX 2 Pro",
    description: "High quality, slower (~10s)",
  },
  "imagen-4-ultra": {
    name: "Imagen 4 Ultra",
    description: "Google's best, photorealistic",
  },
  "nano-banana-pro": {
    name: "Nano Banana Pro",
    description: "Good for creative/artistic images",
  },
} as const;

export type ImageModel = keyof typeof IMAGE_MODELS;

// Aspect ratios
export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

// Output schema for type inference
export const ImageGenResultSchema = z.object({
  imageUrl: z.string().describe("URL of the generated image"),
  key: z.string().describe("Storage key for the image"),
  size: z.number().describe("File size in bytes"),
  model: z.string().describe("Model used for generation"),
  aspectRatio: z.string().describe("Aspect ratio of the image"),
  prompt: z.string().describe("The prompt used"),
});

export type ImageGenResult = z.infer<typeof ImageGenResultSchema>;

// Tool definition
export const imageGenTool = tool({
  description: `Generate an image from a text description.
Available models: ${Object.entries(IMAGE_MODELS).map(([id, m]) => `${id} (${m.description})`).join(", ")}.
Available aspect ratios: ${ASPECT_RATIOS.join(", ")}.
Use flux-schnell for quick generations, imagen-4-ultra for photorealistic, flux-2-pro for high quality.`,
  inputSchema: z.object({
    prompt: z.string().describe("Detailed description of the image to generate"),
    model: z
      .enum(Object.keys(IMAGE_MODELS) as [ImageModel, ...ImageModel[]])
      .default(DEFAULT_IMAGE_MODEL)
      .describe("Model to use for generation"),
    aspectRatio: z
      .enum(ASPECT_RATIOS)
      .default("1:1")
      .describe("Aspect ratio of the image"),
  }),
  execute: async ({ prompt, model, aspectRatio }): Promise<ImageGenResult> => {
    const result = await generateImage({
      prompt,
      model,
      aspectRatio,
      folder: "chat-generated-images",
    });

    return {
      imageUrl: result.imageUrl,
      key: result.key,
      size: result.size,
      model,
      aspectRatio,
      prompt,
    };
  },
});

// Type for component props - matches AI SDK v6 tool invocation structure
export interface ImageGenToolType {
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: { prompt: string; model: ImageModel; aspectRatio: AspectRatio };
  output?: ImageGenResult;
  errorText?: string;
}
