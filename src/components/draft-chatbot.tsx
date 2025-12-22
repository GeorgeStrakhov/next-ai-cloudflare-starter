"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { IconCopy, IconPencil, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { ChatBreadcrumb } from "@/components/chat-breadcrumb";
import { ChatExportMenu } from "@/components/chat-export-menu";
import { Markdown } from "@/components/markdown";
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

export function DraftChatbot() {
  const [input, setInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Once chat is created, we track it here and switch to live mode
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeAgentName, setActiveAgentName] = useState("AI");
  const pendingMessageRef = useRef<string | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 150; // ~6 rows
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
      }
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Create transport with chatId in body - only used when activeChatId exists
  const transport = useMemo(
    () =>
      activeChatId
        ? new DefaultChatTransport({
            api: "/api/chat",
            body: { chatId: activeChatId },
          })
        : null,
    [activeChatId]
  );

  // useChat hook - we always call it to maintain hook rules
  const { messages, setMessages, sendMessage, status } = useChat({
    transport: transport ?? new DefaultChatTransport({ api: "/api/chat" }),
    id: activeChatId ?? "draft",
    messages: [],
  });

  const isLoading = status === "streaming" || status === "submitted";

  // When transport changes (chat created), send the pending message
  useEffect(() => {
    if (activeChatId && pendingMessageRef.current && transport) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      // Small delay to ensure transport is ready
      setTimeout(() => {
        sendMessage({ text: msg });
      }, 0);
    }
  }, [activeChatId, transport, sendMessage]);

  // Focus textarea, sync message IDs, and notify sidebar when response completes
  useEffect(() => {
    if (activeChatId && status === "ready" && messages.length > 0) {
      textareaRef.current?.focus();
      // Signal that chat may have been updated (title generated)
      window.dispatchEvent(new CustomEvent("chat-updated"));

      // Sync messages from DB to get correct IDs for edit/retry
      const syncMessages = async () => {
        try {
          const res = await fetch(`/api/chats/${activeChatId}/messages`);
          if (res.ok) {
            const data: { messages: Array<{ id: string; role: string; parts: unknown[]; createdAt?: string }> } = await res.json();
            setMessages(
              data.messages.map((msg) => ({
                ...msg,
                createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
              })) as UIMessage[]
            );
          }
        } catch (e) {
          console.error("Failed to sync messages:", e);
        }
      };
      syncMessages();
    }
  }, [status, activeChatId, setMessages, messages.length]);

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (!activeChatId) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    // Check if message count changed (new message added)
    const messageCountChanged = messages.length !== lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    // Auto-scroll if: new message added, or user is near bottom during streaming
    if (messageCountChanged || (isLoading && isNearBottom)) {
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? "instant" : "smooth" });
    }
  }, [messages, isLoading, activeChatId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isCreating) return;

    // If we already have an active chat, just send the message
    if (activeChatId) {
      if (!isLoading) {
        sendMessage({ text: input });
        setInput("");
      }
      return;
    }

    // Creating new chat
    setIsCreating(true);
    const messageToSend = input.trim();

    try {
      // Create new chat with selected agent
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create chat");

      const data: { chat: { id: string; agent?: { name: string } } } = await res.json();
      const chatId = data.chat.id;

      // Store the pending message to be sent once useChat updates
      pendingMessageRef.current = messageToSend;

      // Update URL without navigation (no remount!)
      window.history.replaceState(null, "", `/dashboard/chat/${chatId}`);

      // Set active chat to switch to live mode
      setActiveAgentName(data.chat.agent?.name || "AI");
      setActiveChatId(chatId);
      setInput("");
      setIsCreating(false);

      // Notify sidebar of new chat
      window.dispatchEvent(new CustomEvent("chat-updated"));
    } catch (err) {
      console.error("Failed to create chat:", err);
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isCreating && (!activeChatId || !isLoading)) {
        handleSubmit(e);
      }
    }
  };

  // Get all text content from a message
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((p) => p.type === "text" && "text" in p)
      .map((p) => (p as { text: string }).text)
      .join("\n\n");
  };

  // If we haven't created a chat yet, show draft UI
  if (!activeChatId) {
    return (
      <div className="flex flex-col flex-1 min-h-0 w-full">
        {/* Set breadcrumb in header */}
        <ChatBreadcrumb
          agentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
        />

        {/* Empty messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a new conversation.</p>
          </div>
        </div>

        {/* Input area */}
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
              disabled={isCreating}
            />
            <Button type="submit" disabled={!input.trim() || isCreating}>
              {isCreating ? (
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

  // Active chat mode - show full chat UI (similar to PersistentChatbot)
  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* Set breadcrumb and export menu in header */}
      <ChatBreadcrumb
        chatId={activeChatId}
        agentId={selectedAgentId}
        onAgentChange={setSelectedAgentId}
      />
      <ChatExportMenu
        chatId={activeChatId}
        messages={messages}
        agentName={activeAgentName}
      />

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a conversation with {activeAgentName}.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`group/message flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-start gap-1 max-w-[80%]">
                {/* Edit button for user messages (left side) */}
                {message.role === "user" && !isLoading && (
                  <button
                    onClick={() => {
                      // TODO: Implement edit for draft chat
                      toast.info("Edit feature available after chat is saved");
                    }}
                    className="md:opacity-0 md:group-hover/message:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground self-center"
                    title="Edit message"
                  >
                    <IconPencil className="size-3.5" />
                  </button>
                )}

                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
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
                  {/* Copy button for assistant messages */}
                  {message.role === "assistant" && getMessageText(message) && (
                    <div className="flex justify-end mt-2 -mb-1 -mr-2">
                      <button
                        onClick={() => {
                          const text = getMessageText(message);
                          navigator.clipboard.writeText(text);
                          toast.success("Copied to clipboard");
                        }}
                        className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy to clipboard"
                      >
                        <IconCopy className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Retry button for assistant messages (right side) */}
                {message.role === "assistant" && !isLoading && (
                  <button
                    onClick={() => {
                      // TODO: Implement retry for draft chat
                      toast.info("Retry feature available after chat is saved");
                    }}
                    className="md:opacity-0 md:group-hover/message:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground self-center"
                    title="Regenerate response"
                  >
                    <IconRefresh className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
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
