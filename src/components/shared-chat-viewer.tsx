"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { ToolInvocationPart } from "@/components/tool-invocation";
import { toast } from "sonner";
import {
  Copy,
  Download,
  GitBranch,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tool invocation state type
type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

// Helper to check if a part is a tool part (starts with "tool-")
function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-");
}

// Extract tool name from part type (e.g., "tool-weather" -> "weather")
function getToolName(part: { type: string }): string {
  return part.type.slice(5);
}

interface MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  createdAt?: string;
}

interface ChatData {
  id: string;
  title: string | null;
  createdAt: string;
  sharingType: "public" | "platform";
  agent: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  owner: {
    name: string;
  };
}

interface ViewerData {
  isAuthenticated: boolean;
  isOwner: boolean;
  canClone: boolean;
  agentAvailable: boolean;
}

interface SharedChatViewerProps {
  sharingUuid: string;
  chat: ChatData;
  messages: Message[];
  viewer: ViewerData;
}

export function SharedChatViewer({
  sharingUuid,
  chat,
  messages,
  viewer,
}: SharedChatViewerProps) {
  const router = useRouter();
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const exportAsMarkdown = () => {
    const lines: string[] = [];

    lines.push(`# ${chat.title || "Shared Chat"}`);
    lines.push("");
    if (chat.agent) {
      lines.push(`**Agent:** ${chat.agent.name}`);
    }
    lines.push(`**Shared by:** ${chat.owner.name}`);
    lines.push(`**Exported:** ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("");

    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "### You" : "### Assistant";
      lines.push(roleLabel);
      lines.push("");

      for (const part of msg.parts) {
        if (part.type === "text" && part.text) {
          lines.push(part.text);
          lines.push("");
        } else if (part.type === "tool-imagegen") {
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
    a.download = `shared-chat-${sharingUuid.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const res = await fetch("/api/chats/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharingUuid }),
      });

      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || "Failed to clone chat");
      }

      const data = await res.json() as { success: boolean; chatId: string };
      toast.success("Chat cloned successfully");
      router.push(`/dashboard/chat/${data.chatId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clone chat");
    } finally {
      setIsCloning(false);
      setCloneDialogOpen(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">
                {chat.title || "Shared Chat"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {chat.agent && <span>{chat.agent.name} • </span>}
                Shared by {chat.owner.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy link
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {viewer.canClone && (
                <Button
                  size="sm"
                  onClick={() => setCloneDialogOpen(true)}
                  disabled={isCloning}
                >
                  {isCloning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitBranch className="h-4 w-4 mr-2" />
                  )}
                  Clone & Continue
                </Button>
              )}
              {!viewer.isAuthenticated && (
                <Button variant="secondary" size="sm" asChild>
                  <a href="/sign-in">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sign in
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Agent not available warning */}
        {viewer.canClone && !viewer.agentAvailable && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Agent not available</p>
              <p className="text-muted-foreground">
                The agent used in this chat is not available to you. If you clone this chat,
                your default agent will be used instead.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
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
                    return (
                      <ToolInvocationPart
                        key={i}
                        toolCallId={part.toolCallId || ""}
                        toolName={getToolName(part)}
                        args={part.input}
                        state={part.state || "output-available"}
                        result={part.output}
                        errorText={part.errorText}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p>This chat has no messages yet.</p>
          </div>
        )}
      </main>

      {/* Clone confirmation dialog */}
      <AlertDialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {viewer.agentAvailable ? (
                <>
                  This will create a copy of this conversation in your account.
                  You can continue the conversation from where it left off.
                </>
              ) : (
                <>
                  This will create a copy of this conversation in your account.
                  <span className="block mt-2 text-warning">
                    Note: The original agent is not available to you. Your default
                    agent will be used instead.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCloning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClone} disabled={isCloning}>
              {isCloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                "Clone chat"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
