import { tool } from "ai"
import { z } from "zod"

export const WebSearchItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string().optional(),
  source: z.string().optional(),
})

export const WebSearchSchema = z.object({
  query: z.string(),
  results: z.array(WebSearchItemSchema),
})

export type WebSearchItem = z.infer<typeof WebSearchItemSchema>
export type WebSearchResult = z.infer<typeof WebSearchSchema>

// Base websearch tool - override execute with a real provider
export const webSearchTool = tool({
  description: "Search the web and return relevant results.",
  inputSchema: z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(20).default(5),
    lang: z.string().optional(),
    country: z.string().optional(),
  }),
  execute: async ({ query }): Promise<WebSearchResult> => {
    // Placeholder - use a provider-specific tool instead
    const results: WebSearchItem[] = []
    return { query, results }
  },
})

// Type for component props - matches AI SDK v6 tool invocation structure
export interface WebSearchToolInvocation {
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: { query: string; limit: number; lang?: string; country?: string };
  output?: WebSearchResult;
  errorText?: string;
}
