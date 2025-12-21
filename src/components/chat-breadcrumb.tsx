"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePageHeader } from "@/components/dashboard/page-header-context";
import { AgentSelector } from "@/components/agent-selector";

interface ChatBreadcrumbProps {
  chatId?: string;
  agentId: string;
  onAgentChange?: (agentId: string) => void;
}

export function ChatBreadcrumb({ chatId, agentId, onAgentChange }: ChatBreadcrumbProps) {
  const router = useRouter();
  const { setBreadcrumb } = usePageHeader();

  const handleAgentChange = async (newAgentId: string) => {
    if (newAgentId === agentId) return;

    // If we have an existing chat, update it via API
    if (chatId) {
      try {
        const res = await fetch(`/api/chats/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: newAgentId }),
        });

        if (!res.ok) throw new Error("Failed to switch agent");

        const data: { chat: { agent: { name: string } } } = await res.json();
        toast.success(`Switched to ${data.chat.agent?.name || "AI Assistant"}`);
        router.refresh();
      } catch (err) {
        console.error("Failed to switch agent:", err);
        toast.error("Failed to switch agent");
        return;
      }
    }

    // Notify parent of change
    onAgentChange?.(newAgentId);
  };

  useEffect(() => {
    setBreadcrumb(
      <span className="flex items-center gap-2 min-w-0">
        <span className="hidden sm:inline">Chat with</span>
        <AgentSelector
          value={agentId}
          onChange={handleAgentChange}
        />
      </span>
    );

    return () => setBreadcrumb(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, setBreadcrumb]);

  return null;
}
