import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import { requireAdmin } from "@/lib/admin";
import { getDb, agent } from "@/db";

/**
 * GET /api/admin/agents - List all agents with full details (admin only)
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const db = await getDb();

    const agents = await db
      .select()
      .from(agent)
      .orderBy(desc(agent.isDefault), desc(agent.createdAt));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents - Create a new agent (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

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
      description?: string;
      systemPrompt?: string;
      model?: string;
      maxToolSteps?: number;
      enabledTools?: string[];
      toolApprovals?: Record<string, boolean>;
      isDefault?: boolean;
      visibility?: "public" | "admin_only";
    };

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!systemPrompt || typeof systemPrompt !== "string" || systemPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: "System prompt is required" },
        { status: 400 }
      );
    }

    if (!model || typeof model !== "string") {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Generate slug from name
    let slug = slugify(name, { lower: true, strict: true });

    // Check if slug already exists, append number if needed
    const existing = await db
      .select({ slug: agent.slug })
      .from(agent)
      .where(eq(agent.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      // Find a unique slug by appending a number
      let counter = 2;
      let newSlug = `${slug}-${counter}`;
      while (true) {
        const check = await db
          .select({ slug: agent.slug })
          .from(agent)
          .where(eq(agent.slug, newSlug))
          .limit(1);
        if (check.length === 0) {
          slug = newSlug;
          break;
        }
        counter++;
        newSlug = `${slug}-${counter}`;
      }
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await db
        .update(agent)
        .set({ isDefault: false })
        .where(eq(agent.isDefault, true));
    }

    const agentId = uuidv4();
    const now = new Date();

    await db.insert(agent).values({
      id: agentId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      systemPrompt: systemPrompt.trim(),
      model,
      maxToolSteps: Math.max(1, Math.min(50, maxToolSteps ?? 5)),
      enabledTools: enabledTools ? JSON.stringify(enabledTools) : null,
      toolApprovals: toolApprovals ? JSON.stringify(toolApprovals) : null,
      isDefault: isDefault || false,
      visibility: visibility || "admin_only",
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created agent
    const [newAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, agentId))
      .limit(1);

    return NextResponse.json({
      success: true,
      agent: newAgent,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
