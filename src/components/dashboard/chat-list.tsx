"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconPlus, IconMessage, IconTrash, IconPencil, IconSearch, IconX } from "@tabler/icons-react";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuAction } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const CHATS_PER_PAGE = 10;

export function ChatList({ onLinkClick }: ChatListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState<ChatItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const fetchChats = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/chats?limit=${CHATS_PER_PAGE}&page=${page}${searchParam}`);
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data: { chats: ChatItem[]; pagination: { total: number; hasMore: boolean } } = await res.json();

      if (append) {
        setChats((prev) => [...prev, ...data.chats]);
      } else {
        setChats(data.chats);
      }
      setPagination({ total: data.pagination.total, hasMore: data.pagination.hasMore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchChats(1, false);
  }, [fetchChats]);

  // Listen for chat updates (e.g., title generated after streaming completes)
  useEffect(() => {
    const handleChatUpdated = () => {
      // Small delay to ensure DB write is complete
      setTimeout(() => fetchChats(1, false), 500);
    };
    window.addEventListener("chat-updated", handleChatUpdated);
    return () => window.removeEventListener("chat-updated", handleChatUpdated);
  }, [fetchChats]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setLoadingMore(true);
    fetchChats(nextPage, true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const handleDeleteClick = (e: React.MouseEvent, chat: ChatItem) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chat);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chatToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chats/${chatToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete chat");

      // Remove from local state
      setChats((prev) => prev.filter((c) => c.id !== chatToDelete.id));

      // If we're on the deleted chat's page, redirect to new chat
      if (pathname === `/dashboard/chat/${chatToDelete.id}`) {
        router.push("/dashboard/chat");
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, chat: ChatItem) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToRename(chat);
    setNewTitle(chat.title || "");
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!chatToRename) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || trimmedTitle === chatToRename.title) {
      setRenameDialogOpen(false);
      setChatToRename(null);
      return;
    }

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/chats/${chatToRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!res.ok) throw new Error("Failed to rename chat");

      // Update local state
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatToRename.id ? { ...c, title: trimmedTitle } : c
        )
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
    } finally {
      setIsRenaming(false);
      setRenameDialogOpen(false);
      setChatToRename(null);
    }
  };

  if (error) {
    return (
      <div className="px-2 py-2 text-xs text-muted-foreground">
        Failed to load chats
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* New Chat link - always visible */}
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/dashboard/chat"}
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/chat" onClick={onLinkClick}>
            <IconPlus className="size-4" />
            <span>New Chat</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Search input */}
      <div className="px-2 py-1">
        <div className="relative">
          <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-7 text-xs bg-muted/50 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      {loading ? (
        // Skeleton placeholders
        <>
          {[1, 2, 3].map((i) => (
            <SidebarMenuItem key={i}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </SidebarMenuItem>
          ))}
        </>
      ) : chats.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          {debouncedSearch ? "No chats found" : "No chats yet"}
        </div>
      ) : (
        <>
          {chats.map((chatItem) => {
            const isActive = pathname === `/dashboard/chat/${chatItem.id}`;
            return (
              <SidebarMenuItem key={chatItem.id} className="group/item">
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link
                    href={`/dashboard/chat/${chatItem.id}`}
                    onClick={onLinkClick}
                    className="truncate"
                  >
                    <IconMessage className="size-4 shrink-0" />
                    <span className="truncate">
                      {chatItem.title || "New Chat"}
                    </span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => handleRenameClick(e, chatItem)}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity right-6"
                  title="Rename chat"
                >
                  <IconPencil className="size-4" />
                </SidebarMenuAction>
                <SidebarMenuAction
                  onClick={(e) => handleDeleteClick(e, chatItem)}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                  title="Delete chat"
                >
                  <IconTrash className="size-4" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            );
          })}

          {/* Load more button */}
          {pagination.hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors text-left"
            >
              {loadingMore ? (
                "Loading..."
              ) : (
                `+ ${pagination.total - chats.length} more chats`
              )}
            </button>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{chatToDelete?.title || "New Chat"}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat title"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isRenaming) {
                handleRenameConfirm();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={isRenaming}>
              {isRenaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
