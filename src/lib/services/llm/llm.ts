/**
 * LLM Service
 *
 * Provides text generation and structured data extraction using AI SDK 6 with OpenRouter.
 *
 * Features:
 * - Text generation with customizable parameters
 * - Structured data extraction using Zod schemas
 * - Streaming text generation for real-time responses
 * - Multiple model support (GPT-4.1 Mini, Gemini Flash, Claude Haiku)
 *
 * Usage:
 * ```typescript
 * // Simple text generation
 * const response = await generateText({
 *   prompt: "Write a haiku about coding",
 *   model: LLM_MODELS.GPT_4_1_MINI
 * });
 *
 * // Structured data extraction
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const data = await generateObject({
 *   prompt: "Extract: John is 25 years old",
 *   schema
 * });
 *
 * // Streaming text (for chat interfaces)
 * const stream = await streamText({
 *   prompt: "Tell me a story",
 *   onChunk: (chunk) => console.log(chunk)
 * });
 * ```
 */

import { generateObject as aiGenerateObject, generateText as aiGenerateText, streamText as aiStreamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import {
  GenerateTextOptions,
  GenerateObjectOptions,
  StreamTextOptions,
  TextResponse,
  ObjectResponse,
  LLM_MODELS,
} from "./types";

/**
 * Get OpenRouter client instance using OpenAI-compatible provider
 */
export function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/**
 * Generate text response from a prompt
 *
 * @param prompt - The user prompt
 * @param options - Generation options (model, temperature, etc.)
 * @returns Text response with metadata
 *
 * @example
 * const response = await generateText({
 *   prompt: "Explain quantum computing in simple terms",
 *   model: LLM_MODELS.GPT_4O_MINI,
 *   temperature: 0.7
 * });
 * console.log(response.text);
 */
export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<TextResponse> {
  const {
    model = LLM_MODELS.GPT_4_1_MINI,
    temperature = 0.7,
    systemPrompt,
  } = options;

  const openrouter = getOpenRouter();

  const result = await aiGenerateText({
    model: openrouter(model),
    prompt,
    system: systemPrompt,
    temperature,
  });

  return {
    text: result.text,
    finishReason: result.finishReason,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };
}

/**
 * Generate structured object from a prompt using a Zod schema
 *
 * @param prompt - The user prompt
 * @param options - Generation options including Zod schema
 * @returns Typed object matching the schema
 *
 * @example
 * const PersonSchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 *   occupation: z.string()
 * });
 *
 * const person = await generateObject({
 *   prompt: "Extract person info: John Smith is a 30 year old engineer",
 *   schema: PersonSchema
 * });
 * console.log(person.object.name); // Type-safe!
 */
export async function generateObject<T extends z.ZodType>(
  prompt: string,
  options: GenerateObjectOptions<T>
): Promise<ObjectResponse<z.infer<T>>> {
  const {
    model = LLM_MODELS.GPT_4_1_MINI,
    temperature = 0.7,
    systemPrompt,
    schema,
    schemaName = "response",
    schemaDescription = "Generated response object",
  } = options;

  const openrouter = getOpenRouter();

  const result = await aiGenerateObject({
    model: openrouter(model),
    prompt,
    system: systemPrompt,
    temperature,
    schema,
    schemaName,
    schemaDescription,
  });

  return {
    object: result.object as z.infer<T>,
    finishReason: result.finishReason,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };
}

/**
 * Stream text generation for real-time responses (e.g., chat interfaces)
 *
 * @param prompt - The user prompt
 * @param options - Streaming options
 * @returns Readable stream of text chunks
 *
 * @example
 * // Server-side streaming
 * const stream = await streamText({
 *   prompt: "Write a long story",
 *   model: LLM_MODELS.CLAUDE_HAIKU
 * });
 *
 * return stream.toDataStreamResponse();
 *
 * @example
 * // With callback for each chunk
 * await streamText({
 *   prompt: "Count to 10",
 *   onChunk: (chunk) => console.log(chunk)
 * });
 */
export async function streamText(
  prompt: string,
  options: StreamTextOptions = {}
) {
  const {
    model = LLM_MODELS.GPT_4_1_MINI,
    temperature = 0.7,
    systemPrompt,
    onChunk,
  } = options;

  const openrouter = getOpenRouter();

  const result = aiStreamText({
    model: openrouter(model),
    prompt,
    system: systemPrompt,
    temperature,
    onChunk: onChunk ? ({ chunk }) => {
      const text = chunk.type === "text-delta" ? chunk.text : "";
      if (text) onChunk(text);
    } : undefined,
  });

  return result;
}
