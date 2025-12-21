"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { IconCopy, IconPencil, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { ChatBreadcrumb } from "@/components/chat-breadcrumb";
import { ChatExportMenu } from "@/components/chat-export-menu";
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
  chatTitle?: string;
  initialMessages: SerializedMessage[];
  agentId: string;
  agentName: string;
}

export function PersistentChatbot({
  chatId,
  chatTitle,
  initialMessages,
  agentId,
  agentName,
}: PersistentChatbotProps) {
  const [input, setInput] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState(agentId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; index: number; text: string } | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Retry dialog state
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [retryingMessage, setRetryingMessage] = useState<{ id: string; index: number; userText: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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

  const { messages, setMessages, sendMessage, status } = useChat({
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

  // Focus textarea, sync message IDs, and notify sidebar when response completes
  useEffect(() => {
    if (status === "ready") {
      textareaRef.current?.focus();
      // Signal that chat may have been updated (title generated)
      window.dispatchEvent(new CustomEvent("chat-updated"));

      // Sync messages from DB to get correct IDs for edit/retry
      const syncMessages = async () => {
        try {
          const res = await fetch(`/api/chats/${chatId}/messages`);
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
  }, [status, chatId, setMessages]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
      }
    }
  }, [input]);

  // Scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    // Check if message count changed (new message added)
    const messageCountChanged = messages.length !== lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    // Auto-scroll if: new message added, or user is near bottom during streaming
    if (messageCountChanged || (isLoading && isNearBottom)) {
      // Use instant scroll during streaming to avoid jitter, smooth otherwise
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? "instant" : "smooth" });
    }
  }, [messages, isLoading]);

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

  // Get all text content from a message (combines all text parts)
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((p) => p.type === "text" && "text" in p)
      .map((p) => (p as { text: string }).text)
      .join("\n\n");
  };

  // Open edit dialog for a user message
  const handleEditClick = (message: UIMessage, index: number) => {
    const text = getMessageText(message);
    setEditingMessage({ id: message.id, index, text });
    setEditContent(text);
    setEditDialogOpen(true);
  };

  // Count messages that will be deleted
  const messagesAfterEdit = editingMessage
    ? messages.length - editingMessage.index - 1
    : 0;

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingMessage || !editContent.trim()) return;

    setIsEditing(true);
    try {
      // Delete the message and all after it (we'll resend with new content)
      const res = await fetch(`/api/chats/${chatId}/messages/${editingMessage.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error || "Failed to edit message");
      }

      // Update local messages - keep only messages BEFORE the edited one
      const updatedMessages = messages.slice(0, editingMessage.index);
      setMessages(updatedMessages as UIMessage[]);
      setEditDialogOpen(false);
      setEditingMessage(null);

      // Send the edited content as a new message (creates fresh message + triggers response)
      sendMessage({ text: editContent.trim() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to edit message");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle retry click - show dialog if not last message, otherwise retry directly
  const handleRetryClick = (_message: UIMessage, index: number) => {
    const userMessageIndex = index - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== "user") {
      toast.error("No user message found to retry");
      return;
    }

    const userMessage = messages[userMessageIndex];
    const userText = getMessageText(userMessage);
    const messagesAfter = messages.length - index - 1;

    if (messagesAfter > 0) {
      // Show confirmation dialog
      setRetryingMessage({ id: userMessage.id, index, userText });
      setRetryDialogOpen(true);
    } else {
      // Last message, retry directly
      executeRetry(userMessage.id, userMessageIndex, userText);
    }
  };

  // Execute the retry
  const executeRetry = async (userMessageId: string, userMessageIndex: number, userText: string) => {
    setIsRetrying(true);
    setRetryDialogOpen(false);
    try {
      // Delete the user message (and all after it including assistant) from DB
      const res = await fetch(`/api/chats/${chatId}/messages/${userMessageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error || "Failed to retry");
      }

      // Remove user message and all after from local state
      const updatedMessages = messages.slice(0, userMessageIndex);
      setMessages(updatedMessages as UIMessage[]);

      // Re-send the user message (creates fresh message + triggers response)
      if (userText) {
        sendMessage({ text: userText });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry");
    } finally {
      setIsRetrying(false);
      setRetryingMessage(null);
    }
  };

  // Count messages that will be deleted for retry
  const messagesAfterRetry = retryingMessage
    ? messages.length - retryingMessage.index - 1
    : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      {/* Set breadcrumb and export menu in header */}
      <ChatBreadcrumb
        chatId={chatId}
        agentId={currentAgentId}
        onAgentChange={setCurrentAgentId}
      />
      <ChatExportMenu
        chatId={chatId}
        chatTitle={chatTitle}
        messages={messages}
        agentName={agentName}
      />

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a conversation with {agentName}.</p>
          </div>
        ) : (
          messages.map((message, messageIndex) => (
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
                    onClick={() => handleEditClick(message, messageIndex)}
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
                  {/* Copy button for assistant messages (only if there's text) */}
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
                {message.role === "assistant" && !isLoading && !isRetrying && (
                  <button
                    onClick={() => handleRetryClick(message, messageIndex)}
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

      {/* Edit message dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              {messagesAfterEdit > 0 ? (
                <span className="text-warning">
                  This will delete {messagesAfterEdit} message{messagesAfterEdit !== 1 ? "s" : ""} below and generate a new response.
                </span>
              ) : (
                "Edit your message and generate a new response."
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            className="resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isEditing || !editContent.trim()}
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Regenerate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry confirmation dialog */}
      <Dialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Response</DialogTitle>
            <DialogDescription>
              <span className="text-warning">
                This will delete {messagesAfterRetry + 1} message{messagesAfterRetry + 1 !== 1 ? "s" : ""} below and generate a new response.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRetryDialogOpen(false);
                setRetryingMessage(null);
              }}
              disabled={isRetrying}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (retryingMessage) {
                  const userMessageIndex = retryingMessage.index - 1;
                  executeRetry(retryingMessage.id, userMessageIndex, retryingMessage.userText);
                }
              }}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
