"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ChatBreadcrumb } from "@/components/chat-breadcrumb";
import { ToolInvocationPart } from "@/components/tool-invocation";

// Tool invocation state type
type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

// Helper to check if a part is a tool part (starts with "tool-")
function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-");
}

// Extract tool name from part type (e.g., "tool-weather" -> "weather")
function getToolName(part: { type: string }): string {
  return part.type.slice(5); // Remove "tool-" prefix
}

// Message part base type - parts can have various types from AI SDK
interface MessagePartBase {
  type: string;
  [key: string]: unknown;
}

// Props use serializable types (Date becomes string when passed from server)
interface SerializedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: MessagePartBase[];
  createdAt?: Date | string;
}

interface PersistentChatbotProps {
  chatId: string;
  initialMessages: SerializedMessage[];
  agentId: string;
  agentName: string;
}

export function PersistentChatbot({
  chatId,
  initialMessages,
  agentId,
  agentName,
}: PersistentChatbotProps) {
  const [input, setInput] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState(agentId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 150; // ~6 rows
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  };

  // Convert serialized Date strings back to Date objects
  const normalizedMessages = useMemo(
    () =>
      initialMessages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
      })) as UIMessage[],
    [initialMessages]
  );

  // Create transport with chatId in body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          chatId,
        },
      }),
    [chatId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    id: chatId,
    messages: normalizedMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Check for draft message from /dashboard/chat and send it
  useEffect(() => {
    const draftKey = `draft-message-${chatId}`;
    const draftMessage = sessionStorage.getItem(draftKey);
    if (draftMessage) {
      sessionStorage.removeItem(draftKey);
      sendMessage({ text: draftMessage });
    }
  }, [chatId, sendMessage]);

  // Focus textarea and notify sidebar when response completes
  useEffect(() => {
    if (status === "ready") {
      textareaRef.current?.focus();
      // Signal that chat may have been updated (title generated)
      window.dispatchEvent(new CustomEvent("chat-updated"));
    }
  }, [status]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
      }
    }
  }, [input]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without shift), Cmd/Ctrl+Enter also sends
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage({ text: input });
        setInput("");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* Set breadcrumb in header */}
      <ChatBreadcrumb
        chatId={chatId}
        agentId={currentAgentId}
        onAgentChange={setCurrentAgentId}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a conversation with {agentName}.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    // Render markdown for assistant, plain text for user
                    if (message.role === "assistant") {
                      return (
                        <Markdown key={i} className="text-sm">
                          {part.text}
                        </Markdown>
                      );
                    }
                    return (
                      <p key={i} className="text-sm whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (isToolPart(part)) {
                    // Cast to access tool-specific properties
                    const toolPart = part as {
                      type: string;
                      toolCallId: string;
                      state: ToolState;
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <ToolInvocationPart
                        key={i}
                        toolCallId={toolPart.toolCallId}
                        toolName={getToolName(toolPart)}
                        args={toolPart.input}
                        state={toolPart.state}
                        result={toolPart.output}
                        errorText={toolPart.errorText}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - styled like PromptBar */}
      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-h-[40px] max-h-[150px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send"
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
