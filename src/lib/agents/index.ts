/**
 * Agents Module
 *
 * Provides agent configuration and runtime utilities.
 */

// Factory for creating runtime configs from DB records
export {
  createAgentFromConfig,
  getDefaultAgentConfig,
  type AgentRuntimeConfig,
} from "./factory";

// Tool registry and utilities
export {
  getToolsForAgent,
  getAvailableToolSlugs,
  isValidTool,
  AVAILABLE_TOOLS,
  type ToolDefinition,
  type ToolRegistry,
  type ToolInfo,
} from "./tools";

// Title generation utility
export { generateChatTitle } from "./title-generator";
