export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, agent } from "@/db";
import { AgentForm } from "@/components/admin/agent-form";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getAgent(id: string) {
  const db = await getDb();
  const [foundAgent] = await db
    .select()
    .from(agent)
    .where(eq(agent.id, id))
    .limit(1);
  return foundAgent;
}

export default async function EditAgentPage({ params }: PageProps) {
  const { id } = await params;
  const agentData = await getAgent(id);

  if (!agentData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/agents">
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground">
            Modify {agentData.name}&apos;s configuration
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <AgentForm agent={agentData} mode="edit" />
      </div>
    </div>
  );
}
