/**
 * Tool Registry
 *
 * Central registry of all available tools that agents can use.
 * Each tool is a function that the AI can invoke during a conversation.
 *
 * Tools are defined using the AI SDK's tool() helper and include:
 * - Description: Helps the AI understand when to use the tool
 * - Parameters: Zod schema defining the tool's input
 * - Execute: The function that runs when the tool is invoked
 *
 * Phase 4 will implement actual tools here (web_search, calculator, etc.)
 */

// Phase 4: import { tool } from "ai"; - will be used when implementing tools

/**
 * Tool definition type (placeholder until Phase 4)
 * Will be: ReturnType<typeof tool> when tools are implemented
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolDefinition = any;

/**
 * Registry of tool slug -> tool definition
 */
export type ToolRegistry = Record<string, ToolDefinition>;

/**
 * Tool metadata for admin UI
 */
export interface ToolInfo {
  slug: string;
  name: string;
  description: string;
  /** Whether this tool requires user approval before execution */
  requiresApproval: boolean;
}

/**
 * All available tools in the system.
 * Add new tools here as they are implemented in Phase 4.
 */
const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // Phase 4: Implement actual tools
  // Example structure:
  //
  // web_search: tool({
  //   description: "Search the web for current information",
  //   parameters: z.object({
  //     query: z.string().describe("The search query"),
  //   }),
  //   execute: async ({ query }) => {
  //     // Implementation
  //     return { results: [] };
  //   },
  // }),
};

/**
 * Metadata about each tool for the admin UI
 */
export const AVAILABLE_TOOLS: ToolInfo[] = [
  // Phase 4: Add tool metadata here
  // {
  //   slug: "web_search",
  //   name: "Web Search",
  //   description: "Search the web for current information",
  //   requiresApproval: false,
  // },
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
      // TODO Phase 4: Handle approval requirements
      // If approvals[slug] is true, wrap tool with confirmation step
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
