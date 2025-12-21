import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import slugify from "slugify";
import { requireAdmin } from "@/lib/admin";
import { getDb, agent, chat } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/agents/[id] - Get a single agent (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();

    const [foundAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!foundAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent: foundAgent });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/agents/[id] - Update an agent (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      systemPrompt,
      model,
      maxToolSteps,
      enabledTools,
      toolApprovals,
      isDefault,
      visibility,
    } = body as {
      name?: string;
      description?: string | null;
      systemPrompt?: string;
      model?: string;
      maxToolSteps?: number;
      enabledTools?: string[] | null;
      toolApprovals?: Record<string, boolean> | null;
      isDefault?: boolean;
      visibility?: "public" | "admin_only";
    };

    const db = await getDb();

    // Check agent exists
    const [existingAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<{
      name: string;
      slug: string;
      description: string | null;
      systemPrompt: string;
      model: string;
      maxToolSteps: number;
      enabledTools: string | null;
      toolApprovals: string | null;
      isDefault: boolean;
      visibility: "public" | "admin_only";
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    // Handle name change (also updates slug)
    if (name !== undefined && name.trim().length > 0) {
      updates.name = name.trim();

      // Generate new slug if name changed
      if (name.trim() !== existingAgent.name) {
        let slug = slugify(name, { lower: true, strict: true });

        // Check if slug already exists (excluding current agent)
        const existing = await db
          .select({ id: agent.id })
          .from(agent)
          .where(eq(agent.slug, slug))
          .limit(1);

        if (existing.length > 0 && existing[0].id !== id) {
          let counter = 2;
          let newSlug = `${slug}-${counter}`;
          while (true) {
            const check = await db
              .select({ id: agent.id })
              .from(agent)
              .where(eq(agent.slug, newSlug))
              .limit(1);
            if (check.length === 0 || check[0].id === id) {
              slug = newSlug;
              break;
            }
            counter++;
            newSlug = `${slug}-${counter}`;
          }
        }

        updates.slug = slug;
      }
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (systemPrompt !== undefined && systemPrompt.trim().length > 0) {
      updates.systemPrompt = systemPrompt.trim();
    }

    if (model !== undefined) {
      updates.model = model;
    }

    if (maxToolSteps !== undefined) {
      updates.maxToolSteps = Math.max(1, Math.min(50, maxToolSteps));
    }

    if (enabledTools !== undefined) {
      updates.enabledTools = enabledTools ? JSON.stringify(enabledTools) : null;
    }

    if (toolApprovals !== undefined) {
      updates.toolApprovals = toolApprovals ? JSON.stringify(toolApprovals) : null;
    }

    // Handle isDefault - only one agent can be default
    if (isDefault !== undefined) {
      if (isDefault && !existingAgent.isDefault) {
        // Setting as new default - unset existing default
        await db
          .update(agent)
          .set({ isDefault: false })
          .where(eq(agent.isDefault, true));
      }
      updates.isDefault = isDefault;
    }

    if (visibility !== undefined) {
      updates.visibility = visibility;
    }

    // Update the agent
    await db
      .update(agent)
      .set(updates)
      .where(eq(agent.id, id));

    // Fetch updated agent
    const [updatedAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/agents/[id] - Delete an agent (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();

    // Check agent exists
    const [existingAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, id))
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting the default agent
    if (existingAgent.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default agent. Set another agent as default first." },
        { status: 400 }
      );
    }

    // Check if agent is being used by any chats
    const chatsUsingAgent = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.agentId, id))
      .limit(1);

    if (chatsUsingAgent.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete agent that is being used by existing chats" },
        { status: 400 }
      );
    }

    // Delete the agent
    await db.delete(agent).where(eq(agent.id, id));

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
