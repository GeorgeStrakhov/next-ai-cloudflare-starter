/**
 * Agent Factory
 *
 * Transforms an agent database record into a runtime configuration
 * that can be used with the AI SDK's streamText/generateText functions.
 *
 * This is the bridge between static DB configuration and live AI execution.
 */

import type { Agent } from "@/db/schema/agents";
import { getOpenRouter } from "@/lib/services/llm";
import { getToolsForAgent, type ToolRegistry } from "./tools";

/**
 * Runtime configuration returned by the factory.
 * This object can be spread into streamText() or generateText().
 */
export interface AgentRuntimeConfig {
  /** Configured AI SDK model instance */
  model: ReturnType<ReturnType<typeof getOpenRouter>>;
  /** System prompt defining agent behavior */
  system: string;
  /** Tool definitions (if agent has tools enabled) */
  tools?: ToolRegistry;
  /** Original agent metadata for reference */
  metadata: {
    agentId: string;
    agentName: string;
    agentSlug: string;
    modelId: string;
  };
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
 * Creates a runtime configuration from an agent database record.
 *
 * @param agent - The agent record from the database
 * @returns Configuration object ready for AI SDK functions
 *
 * @example
 * ```typescript
 * const agent = await db.select().from(agentTable).where(...);
 * const config = createAgentFromConfig(agent);
 *
 * const result = await streamText({
 *   ...config,           // model, system, tools
 *   messages: [...],
 * });
 * ```
 */
export function createAgentFromConfig(agent: Agent): AgentRuntimeConfig {
  const openrouter = getOpenRouter();

  // Parse tool configuration from JSON
  const enabledToolSlugs = parseJsonSafe<string[]>(agent.enabledTools, []);
  const toolApprovals = parseJsonSafe<Record<string, boolean>>(
    agent.toolApprovals,
    {}
  );

  // Get tool definitions for enabled tools
  const tools = getToolsForAgent(enabledToolSlugs, toolApprovals);

  return {
    model: openrouter(agent.model),
    system: agent.systemPrompt,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
    metadata: {
      agentId: agent.id,
      agentName: agent.name,
      agentSlug: agent.slug,
      modelId: agent.model,
    },
  };
}

/**
 * Default fallback configuration when no agent is available.
 * Uses sensible defaults for a general-purpose assistant.
 */
export function getDefaultAgentConfig(): Omit<AgentRuntimeConfig, "metadata"> {
  const openrouter = getOpenRouter();

  return {
    model: openrouter("google/gemini-2.5-flash"),
    system: "You are a helpful AI assistant. Be concise and friendly.",
    tools: undefined,
  };
}
