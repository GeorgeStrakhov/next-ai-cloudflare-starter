"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { LLM_MODELS } from "@/lib/services/llm";

const MODEL_OPTIONS = [
  { value: LLM_MODELS.GPT_4_1_MINI, label: "GPT-4.1 Mini" },
  { value: LLM_MODELS.GEMINI_FLASH, label: "Gemini 2.5 Flash" },
  { value: LLM_MODELS.CLAUDE_HAIKU, label: "Claude Haiku 4.5" },
] as const;

export function Chatbot() {
  const [selectedModel, setSelectedModel] = useState<string>(
    LLM_MODELS.GPT_4_1_MINI
  );
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat({
    // @ts-expect-error - headers option exists but not in types yet
    headers: {
      "X-Model": selectedModel,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[600px] w-full">
      {/* Header with model selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b gap-3">
        <h2 className="text-lg font-semibold">AI Chatbot</h2>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>Start a conversation with the AI assistant.</p>
            <p className="text-sm mt-2">Messages are not persisted.</p>
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
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}
