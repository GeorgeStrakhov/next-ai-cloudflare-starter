"use client";

import { WeatherCard } from "@ai-tools/weather/component";
import { WebSearchList } from "@ai-tools/websearch/component";
import type { WeatherToolType } from "@ai-tools/weather/tool";
import type { WebSearchToolInvocation } from "@ai-tools/websearch/tool";

/**
 * Tool invocation states (AI SDK v6)
 */
type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

interface ToolInvocationPartProps {
  toolCallId: string;
  toolName: string;
  args: unknown;
  state: ToolState;
  result?: unknown;
  errorText?: string;
}

/**
 * Component to render tool invocations
 * Routes to the appropriate tool-specific component
 */
export function ToolInvocationPart({
  toolCallId,
  toolName,
  args,
  state,
  result,
  errorText,
}: ToolInvocationPartProps) {
  // Create the invocation object that tool components expect
  const invocation = {
    toolCallId,
    state,
    input: args,
    output: result,
    errorText,
  };

  // Route to tool-specific components
  switch (toolName) {
    case "weather":
      return <WeatherCard invocation={invocation as WeatherToolType} />;

    case "websearch":
      return <WebSearchList invocation={invocation as WebSearchToolInvocation} />;

    default:
      // Fallback for unknown tools - render as JSON
      return (
        <div className="my-2 rounded-lg border bg-muted/30 overflow-hidden p-4">
          <div className="text-sm font-medium mb-2">Tool: {toolName}</div>
          {state === "input-streaming" || state === "input-available" ? (
            <div className="text-sm text-muted-foreground">Running...</div>
          ) : null}
          {state === "output-error" ? (
            <div className="text-sm text-destructive">{errorText || "Error"}</div>
          ) : null}
          {state === "output-available" && result ? (
            <pre className="text-xs bg-background/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      );
  }
}
