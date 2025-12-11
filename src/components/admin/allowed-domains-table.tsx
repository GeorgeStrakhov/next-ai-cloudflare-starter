"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { IconPlus, IconTrash, IconSearch } from "@tabler/icons-react";
import { toast } from "sonner";
import type { AllowedDomain } from "@/db/schema";

interface AllowedDomainsTableProps {
  initialDomains: AllowedDomain[];
}

export function AllowedDomainsTable({
  initialDomains,
}: AllowedDomainsTableProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [search, setSearch] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDomain, setDeleteDomain] = useState<string | null>(null);

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleAdd = async () => {
    if (!newDomain.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/access/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain, note: newNote || undefined }),
      });

      const data = (await response.json()) as {
        error?: string;
        domain?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add domain");
      }

      // Update local state with new domain
      setDomains((prev) => [
        ...prev,
        {
          domain: data.domain!,
          note: newNote || null,
          createdAt: new Date(),
          createdBy: null,
        },
      ]);
      setNewDomain("");
      setNewNote("");
      toast.success(`@${data.domain} added to whitelist`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDomain) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/access/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: deleteDomain }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove domain");
      }

      setDomains((prev) => prev.filter((d) => d.domain !== deleteDomain));
      toast.success(`@${deleteDomain} removed from whitelist`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove domain"
      );
    } finally {
      setLoading(false);
      setDeleteDomain(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed Domains</CardTitle>
        <CardDescription>
          Email domains that can sign in when restricted mode is enabled. All
          emails @domain will be allowed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Domain</label>
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input
              placeholder="e.g., Company employees"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={loading || !newDomain.trim()}>
            <IconPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search
                        ? "No domains found matching your search"
                        : "No allowed domains yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((domain) => (
                  <TableRow key={domain.domain}>
                    <TableCell className="font-medium">
                      @{domain.domain}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.note || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(domain.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDomain(domain.domain)}
                        className="text-destructive hover:text-destructive"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog
          open={!!deleteDomain}
          onOpenChange={() => setDeleteDomain(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Domain</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove @{deleteDomain} from the
                whitelist? Users with this email domain will no longer be able
                to sign in when restricted mode is enabled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
