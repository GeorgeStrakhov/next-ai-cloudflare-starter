export const dynamic = "force-dynamic";

import Link from "next/link";
import { AgentForm } from "@/components/admin/agent-form";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/agents">
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Agent</h1>
          <p className="text-muted-foreground">
            Create a new AI agent with custom configuration
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <AgentForm mode="create" />
      </div>
    </div>
  );
}
