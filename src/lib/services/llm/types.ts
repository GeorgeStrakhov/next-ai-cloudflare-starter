import { z } from "zod";

/**
 * Available LLM models via OpenRouter
 */
export const LLM_MODELS = {
  GPT_4_1_MINI: "openai/gpt-4.1-mini",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",
  CLAUDE_HAIKU: "anthropic/claude-haiku-4.5",
  MISTRAL_SMALL: "mistralai/mistral-small-creative",
} as const;

export type LLMModel = (typeof LLM_MODELS)[keyof typeof LLM_MODELS];

/**
 * LLM generation options
 */
export interface GenerateTextOptions {
  model?: LLMModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface GenerateObjectOptions<T extends z.ZodType> extends GenerateTextOptions {
  schema: T;
  schemaName?: string;
  schemaDescription?: string;
}

export interface StreamTextOptions extends GenerateTextOptions {
  onChunk?: (chunk: string) => void;
}

/**
 * LLM response types
 */
export interface TextResponse {
  text: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ObjectResponse<T> extends Omit<TextResponse, "text"> {
  object: T;
}
