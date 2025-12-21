import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin";
import { getDb, agent } from "@/db";

/**
 * GET /api/agents - List all available agents
 */
export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const db = await getDb();

    const agents = await db
      .select({
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        model: agent.model,
        isDefault: agent.isDefault,
      })
      .from(agent);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
