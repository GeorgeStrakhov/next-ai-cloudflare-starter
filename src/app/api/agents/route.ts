import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth, isAdmin } from "@/lib/admin";
import { getDb, agent } from "@/db";

/**
 * GET /api/agents - List available agents
 * - Admins see all agents
 * - Regular users only see public agents
 */
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const db = await getDb();
    const userIsAdmin = await isAdmin(session.user.email);

    let agents;

    if (userIsAdmin) {
      // Admins see all agents
      agents = await db
        .select({
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          description: agent.description,
          model: agent.model,
          isDefault: agent.isDefault,
          visibility: agent.visibility,
        })
        .from(agent);
    } else {
      // Regular users only see public agents
      agents = await db
        .select({
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          description: agent.description,
          model: agent.model,
          isDefault: agent.isDefault,
          visibility: agent.visibility,
        })
        .from(agent)
        .where(eq(agent.visibility, "public"));
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
