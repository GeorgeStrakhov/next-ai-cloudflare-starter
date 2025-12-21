"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { IconPencil, IconTrash, IconCircleCheck, IconCircle, IconEye, IconEyeOff } from "@tabler/icons-react";
import { toast } from "sonner";
import type { Agent } from "@/db/schema/agents";

interface AgentsTableProps {
  agents: Agent[];
}

export function AgentsTable({ agents: initialAgents }: AgentsTableProps) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentToDelete.id}`, {
        method: "DELETE",
      });

      const data: { success?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete agent");
      }

      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id));
      toast.success("Agent deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete agent");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleSetDefault = async (agent: Agent) => {
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      const data: { success?: boolean; agent?: Agent; error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to set default");
      }

      // Update local state
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === agent.id,
        }))
      );
      toast.success(`${agent.name} is now the default agent`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set default");
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Tools</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No agents yet. Create your first agent to get started.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => {
                const tools = agent.enabledTools
                  ? JSON.parse(agent.enabledTools) as string[]
                  : [];

                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{agent.name}</span>
                          {agent.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        {agent.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {agent.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {agent.model.split("/").pop()}
                      </code>
                    </TableCell>
                    <TableCell>
                      {agent.visibility === "public" ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <IconEye className="h-3 w-3" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <IconEyeOff className="h-3 w-3" />
                          Admin only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tools.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tools.slice(0, 3).map((tool) => (
                            <Badge key={tool} variant="outline" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                          {tools.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tools.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(agent.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!agent.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(agent)}
                            title="Set as default"
                          >
                            <IconCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {agent.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            disabled
                            title="Default agent"
                          >
                            <IconCircleCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/admin/agents/${agent.id}`)}
                          title="Edit agent"
                        >
                          <IconPencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setAgentToDelete(agent);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={agent.isDefault}
                          title={agent.isDefault ? "Cannot delete default agent" : "Delete agent"}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{agentToDelete?.name}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
