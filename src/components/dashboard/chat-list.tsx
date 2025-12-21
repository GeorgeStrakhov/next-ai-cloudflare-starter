"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconPlus, IconMessage, IconLoader2 } from "@tabler/icons-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface ChatItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Pagination {
  total: number;
  hasMore: boolean;
}

interface ChatListProps {
  onLinkClick?: () => void;
}

export function ChatList({ onLinkClick }: ChatListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats?limit=10");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      setChats(data.chats);
      setPagination({ total: data.pagination.total, hasMore: data.pagination.hasMore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Listen for chat updates (e.g., title generated after streaming completes)
  useEffect(() => {
    const handleChatUpdated = () => {
      // Small delay to ensure DB write is complete
      setTimeout(fetchChats, 500);
    };
    window.addEventListener("chat-updated", handleChatUpdated);
    return () => window.removeEventListener("chat-updated", handleChatUpdated);
  }, [fetchChats]);

  const handleNewChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to create chat");
      const data = await res.json();
      // Navigate to new chat
      router.push(`/dashboard/chat/${data.chat.id}`);
      onLinkClick?.();
    } catch (err) {
      console.error("Failed to create chat:", err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 py-2 text-xs text-muted-foreground">
        Failed to load chats
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* New Chat button */}
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleNewChat}
          disabled={creating}
          className="text-muted-foreground hover:text-foreground"
        >
          {creating ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconPlus className="size-4" />
          )}
          <span>{creating ? "Creating..." : "New Chat"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Chat list */}
      {chats.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          No chats yet
        </div>
      ) : (
        <>
          {chats.map((chat) => {
            const isActive = pathname === `/dashboard/chat/${chat.id}`;
            return (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link
                    href={`/dashboard/chat/${chat.id}`}
                    onClick={onLinkClick}
                    className="truncate"
                  >
                    <IconMessage className="size-4 shrink-0" />
                    <span className="truncate">
                      {chat.title || "New Chat"}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Show "more" indicator if there are more chats */}
          {pagination.hasMore && (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              +{pagination.total - chats.length} more chats
            </div>
          )}
        </>
      )}
    </div>
  );
}
