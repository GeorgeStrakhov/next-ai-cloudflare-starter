"use client";

import { useChat, type UIMessage, type UIMessagePart } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

// Props use serializable types (Date becomes string when passed from server)
interface SerializedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: UIMessagePart[];
  createdAt?: Date | string;
}

interface PersistentChatbotProps {
  chatId: string;
  initialMessages: SerializedMessage[];
  agentName: string;
}

export function PersistentChatbot({
  chatId,
  initialMessages,
  agentName,
}: PersistentChatbotProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Focus input and notify sidebar when response completes
  useEffect(() => {
    if (status === "ready") {
      inputRef.current?.focus();
      // Signal that chat may have been updated (title generated)
      window.dispatchEvent(new CustomEvent("chat-updated"));
    }
  }, [status]);

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

  return (
    <Card className="flex flex-col h-[600px] w-full">
      {/* Header with agent name */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{agentName}</h2>
        <span className="text-sm text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a conversation with {agentName}.</p>
            <p className="text-sm mt-2">Your messages will be saved.</p>
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
                    return (
                      <p key={i} className="text-sm whitespace-pre-wrap">
                        {part.text}
                      </p>
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

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
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
      </form>
    </Card>
  );
}
