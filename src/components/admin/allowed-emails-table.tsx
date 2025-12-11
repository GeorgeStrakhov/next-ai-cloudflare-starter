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
import type { AllowedEmail } from "@/db/schema";

interface AllowedEmailsTableProps {
  initialEmails: AllowedEmail[];
}

export function AllowedEmailsTable({ initialEmails }: AllowedEmailsTableProps) {
  const [emails, setEmails] = useState(initialEmails);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);

  const filteredEmails = emails.filter((e) =>
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/access/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, note: newNote || undefined }),
      });

      const data = (await response.json()) as { error?: string; email?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add email");
      }

      // Update local state with new email
      setEmails((prev) => [
        ...prev,
        {
          email: data.email!,
          note: newNote || null,
          createdAt: new Date(),
          createdBy: null,
        },
      ]);
      setNewEmail("");
      setNewNote("");
      toast.success(`${data.email} added to whitelist`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add email"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/access/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove email");
      }

      setEmails((prev) => prev.filter((e) => e.email !== deleteEmail));
      toast.success(`${deleteEmail} removed from whitelist`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove email"
      );
    } finally {
      setLoading(false);
      setDeleteEmail(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed Emails</CardTitle>
        <CardDescription>
          Individual email addresses that can sign in when restricted mode is
          enabled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input
              placeholder="e.g., Marketing team"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={loading || !newEmail.trim()}>
            <IconPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search
                        ? "No emails found matching your search"
                        : "No allowed emails yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.email}>
                    <TableCell className="font-medium">{email.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {email.note || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(email.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteEmail(email.email)}
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
          open={!!deleteEmail}
          onOpenChange={() => setDeleteEmail(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Email</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {deleteEmail} from the whitelist?
                They will no longer be able to sign in when restricted mode is
                enabled.
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
