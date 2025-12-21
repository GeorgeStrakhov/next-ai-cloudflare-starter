/**
 * Agent Factory
 *
 * Transforms an agent database record into a configuration object
 * that can be used with streamText for multi-turn chat conversations.
 *
 * Uses a config-based approach that's compatible with AI SDK v6's
 * streamText for chat UIs while providing runtime customization.
 */

import { stepCountIs } from "ai";
import { z } from "zod";
import type { Agent } from "@/db/schema/agents";
import { getOpenRouter } from "@/lib/services/llm";
import { getToolsForAgent, type ToolRegistry } from "./tools";

/**
 * Runtime options that can be passed when calling an agent.
 * These allow per-request customization without creating new agent instances.
 */
export const agentCallOptionsSchema = z.object({
  /** User's timezone for context-aware responses */
  userTimezone: z.string().optional(),
  /** User's preferred language */
  language: z.string().optional(),
  /** Additional context to inject into instructions */
  context: z.string().optional(),
});

export type AgentCallOptions = z.infer<typeof agentCallOptionsSchema>;

/**
 * Agent metadata for reference
 */
export interface AgentMetadata {
  agentId: string;
  agentName: string;
  agentSlug: string;
  modelId: string;
}

/**
 * Agent configuration for use with streamText
 */
export interface AgentConfig {
  /** Configured model instance */
  model: ReturnType<ReturnType<typeof getOpenRouter>>;
  /** System instructions */
  system: string;
  /** Available tools */
  tools?: ToolRegistry;
  /** Stop conditions for tool loops */
  stopWhen: ReturnType<typeof stepCountIs>[];
  /** Agent metadata */
  metadata: AgentMetadata;
}

/**
 * Parse JSON string safely, returning default on failure
 */
function parseJsonSafe<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn("Failed to parse agent JSON config:", json);
    return defaultValue;
  }
}

/**
 * Applies runtime options to an agent's system prompt.
 */
export function applyCallOptions(
  system: string,
  options?: AgentCallOptions
): string {
  if (!options) return system;

  const contextParts: string[] = [];
  if (options.userTimezone) {
    contextParts.push(`User timezone: ${options.userTimezone}`);
  }
  if (options.language) {
    contextParts.push(`Respond in: ${options.language}`);
  }
  if (options.context) {
    contextParts.push(options.context);
  }

  return contextParts.length > 0
    ? `${system}\n\n${contextParts.join("\n")}`
    : system;
}

/**
 * Creates an agent configuration from a database record.
 *
 * The returned config can be spread into streamText() for chat conversations.
 *
 * @param agent - The agent record from the database
 * @returns Configuration object ready for streamText
 *
 * @example
 * ```typescript
 * const agentRecord = await db.select().from(agent).where(...);
 * const config = createAgentFromConfig(agentRecord);
 *
 * const result = streamText({
 *   model: config.model,
 *   system: applyCallOptions(config.system, { userTimezone: "Asia/Tokyo" }),
 *   tools: config.tools,
 *   stopWhen: config.stopWhen,
 *   messages,
 * });
 * ```
 */
export function createAgentFromConfig(agent: Agent): AgentConfig {
  const openrouter = getOpenRouter();

  // Parse tool configuration from JSON
  const enabledToolSlugs = parseJsonSafe<string[]>(agent.enabledTools, []);
  const toolApprovals = parseJsonSafe<Record<string, boolean>>(
    agent.toolApprovals,
    {}
  );

  // Get tool definitions for enabled tools
  const tools = getToolsForAgent(enabledToolSlugs, toolApprovals);
  const hasTools = Object.keys(tools).length > 0;

  return {
    model: openrouter(agent.model),
    system: agent.systemPrompt,
    tools: hasTools ? tools : undefined,
    stopWhen: [stepCountIs(10)], // Max 10 tool execution steps
    metadata: {
      agentId: agent.id,
      agentName: agent.name,
      agentSlug: agent.slug,
      modelId: agent.model,
    },
  };
}

/**
 * Creates a default agent config when no agent is available.
 * Uses sensible defaults for a general-purpose assistant.
 */
export function getDefaultAgentConfig(): Omit<AgentConfig, "metadata"> & { metadata: null } {
  const openrouter = getOpenRouter();

  return {
    model: openrouter("google/gemini-2.5-flash"),
    system: "You are a helpful AI assistant. Be concise and friendly.",
    tools: undefined,
    stopWhen: [stepCountIs(5)],
    metadata: null,
  };
}
