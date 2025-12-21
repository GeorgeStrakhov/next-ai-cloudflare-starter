/**
 * Agents Module
 *
 * Provides agent configuration and runtime utilities.
 */

// Factory for creating agent configs from DB records
export {
  createAgentFromConfig,
  getDefaultAgentConfig,
  applyCallOptions,
  agentCallOptionsSchema,
  type AgentCallOptions,
  type AgentMetadata,
  type AgentConfig,
} from "./factory";

// Tool registry and utilities
export {
  getToolsForAgent,
  getAvailableToolSlugs,
  isValidTool,
  AVAILABLE_TOOLS,
  type ToolRegistry,
  type ToolInfo,
} from "./tools";

// Title generation utility
export { generateChatTitle } from "./title-generator";
