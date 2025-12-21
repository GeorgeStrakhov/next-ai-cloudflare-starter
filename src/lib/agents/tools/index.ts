/**
 * Tool Registry
 *
 * Central registry of all available tools that agents can use.
 * Tools are imported from the ai/tools directory (from AI tools registry).
 */

import { getWeatherTool } from "@ai-tools/weather/tool";
import { webSearchDDGTool } from "@ai-tools/websearch/tool";

/**
 * Registry of tool slug -> tool definition
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolRegistry = Record<string, any>;

/**
 * Tool metadata for admin UI
 */
export interface ToolInfo {
  slug: string;
  name: string;
  description: string;
  /** Category for grouping in admin UI */
  category: "utilities" | "research" | "creative";
  /** Whether this tool requires user approval before execution by default */
  requiresApproval: boolean;
}

/**
 * All available tools in the system.
 * Keys are the tool slugs used in the database.
 */
const TOOL_DEFINITIONS: ToolRegistry = {
  weather: getWeatherTool,
  websearch: webSearchDDGTool,
};

/**
 * Metadata about each tool for the admin UI
 */
export const AVAILABLE_TOOLS: ToolInfo[] = [
  {
    slug: "weather",
    name: "Weather Lookup",
    description: "Get current weather for any location using Open-Meteo API (free, no API key)",
    category: "utilities",
    requiresApproval: false,
  },
  {
    slug: "websearch",
    name: "Topic Lookup",
    description: "Look up factual information about topics, people, places using DuckDuckGo (free, no API key)",
    category: "research",
    requiresApproval: false,
  },
];

/**
 * Get tool definitions for an agent based on enabled tools.
 *
 * @param enabledSlugs - Array of tool slugs the agent has enabled
 * @param approvals - Map of tool slug -> requires approval override
 * @returns Registry of enabled tools ready for AI SDK
 */
export function getToolsForAgent(
  enabledSlugs: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  approvals: Record<string, boolean> = {}
): ToolRegistry {
  const tools: ToolRegistry = {};

  for (const slug of enabledSlugs) {
    const toolDef = TOOL_DEFINITIONS[slug];
    if (toolDef) {
      // TODO: Handle approval requirements when we implement human-in-the-loop
      tools[slug] = toolDef;
    } else {
      console.warn(`Tool "${slug}" is enabled but not defined in registry`);
    }
  }

  return tools;
}

/**
 * Get all available tool slugs
 */
export function getAvailableToolSlugs(): string[] {
  return AVAILABLE_TOOLS.map((t) => t.slug);
}

/**
 * Check if a tool slug is valid
 */
export function isValidTool(slug: string): boolean {
  return slug in TOOL_DEFINITIONS;
}
