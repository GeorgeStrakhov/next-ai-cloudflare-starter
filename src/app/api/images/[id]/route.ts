import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { deleteFile } from "@/lib/services/s3";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/images/[id] - Get a single image by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();
    const [image] = await db
      .select()
      .from(imageOperation)
      .where(
        and(
          eq(imageOperation.id, id),
          eq(imageOperation.userId, session.user.id)
        )
      )
      .limit(1);

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/[id] - Delete a single image
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();

    // Verify ownership and get key for R2 deletion
    const [image] = await db
      .select()
      .from(imageOperation)
      .where(
        and(
          eq(imageOperation.id, id),
          eq(imageOperation.userId, session.user.id)
        )
      )
      .limit(1);

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Delete from R2 (if key exists)
    if (image.outputKey) {
      try {
        await deleteFile(image.outputKey);
      } catch (r2Error) {
        console.error(`Failed to delete ${image.outputKey} from R2:`, r2Error);
        // Continue even if R2 delete fails
      }
    }

    // Delete from database
    await db
      .delete(imageOperation)
      .where(eq(imageOperation.id, id));

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
