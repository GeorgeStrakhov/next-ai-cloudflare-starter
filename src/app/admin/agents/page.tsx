export const dynamic = "force-dynamic";

import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, agent } from "@/db";
import { AgentsTable } from "@/components/admin/agents-table";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

async function getAgents() {
  const db = await getDb();
  return db
    .select()
    .from(agent)
    .orderBy(desc(agent.isDefault), desc(agent.createdAt));
}

export default async function AdminAgentsPage() {
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/agents/new">
            <IconPlus className="h-4 w-4 mr-2" />
            New Agent
          </Link>
        </Button>
      </div>

      <AgentsTable agents={agents} />
    </div>
  );
}
