"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function DraftChatbot() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isCreating) return;

    setIsCreating(true);
    try {
      // Create new chat
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error("Failed to create chat");

      const data = await res.json();
      const chatId = data.chat.id;

      // Store the draft message to be sent after redirect
      sessionStorage.setItem(`draft-message-${chatId}`, input.trim());

      // Navigate to the new chat
      router.push(`/dashboard/chat/${chatId}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isCreating) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
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
