"use client";

import { useEffect } from "react";
import { IconDotsVertical, IconBraces, IconMarkdown } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/components/dashboard/page-header-context";
import { toast } from "sonner";

interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  createdAt?: Date;
}

interface ChatExportMenuProps {
  chatId: string;
  chatTitle?: string;
  messages: Message[];
  agentName: string;
}

export function ChatExportMenu({ chatId, chatTitle, messages, agentName }: ChatExportMenuProps) {
  const { setActions } = usePageHeader();

  const exportAsJson = () => {
    const exportData = {
      chatId,
      title: chatTitle || "Untitled Chat",
      agent: agentName,
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: msg.createdAt?.toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${chatId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  };

  const exportAsMarkdown = () => {
    const lines: string[] = [];

    // Header
    lines.push(`# ${chatTitle || "Chat Export"}`);
    lines.push("");
    lines.push(`**Agent:** ${agentName}`);
    lines.push(`**Exported:** ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("");

    // Messages
    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "### You" : "### Assistant";
      lines.push(roleLabel);
      lines.push("");

      for (const part of msg.parts) {
        if (part.type === "text" && part.text) {
          lines.push(part.text);
          lines.push("");
        } else if (part.type === "tool-imagegen") {
          // Special handling for image generation
          const output = part.output as { imageUrl?: string; prompt?: string; model?: string } | undefined;
          if (output?.imageUrl) {
            lines.push(`> 🖼️ **Generated image** (${output.model || "AI"}): "${output.prompt || "image"}"`);
            lines.push(`> ![Generated image](${output.imageUrl})`);
            lines.push("");
          }
        } else if (part.type.startsWith("tool-")) {
          const toolName = part.type.slice(5);
          lines.push(`> 🔧 Used tool: **${toolName}**`);
          lines.push("");
        }
      }
      lines.push("");
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${chatId.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  useEffect(() => {
    if (messages.length === 0) {
      setActions(null);
      return;
    }

    setActions(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconDotsVertical className="h-4 w-4" />
            <span className="sr-only">Export options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportAsJson}>
            <IconBraces className="mr-2 h-4 w-4" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportAsMarkdown}>
            <IconMarkdown className="mr-2 h-4 w-4" />
            Export as Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, chatId, chatTitle, agentName]);

  return null;
}
