import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { uploadFile } from "@/lib/services/s3";
import type { OperationType } from "@/db/schema/image-operations";

/**
 * GET /api/images - List user's images with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const filter = searchParams.get("filter") as OperationType | "all" | null;

    const offset = (page - 1) * limit;

    const db = await getDb();

    // Build query conditions
    const conditions = [eq(imageOperation.userId, session.user.id)];

    if (filter && filter !== "all") {
      conditions.push(eq(imageOperation.operationType, filter));
    }

    // Get images with pagination
    const images = await db
      .select()
      .from(imageOperation)
      .where(and(...conditions))
      .orderBy(desc(imageOperation.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const allImages = await db
      .select({ id: imageOperation.id })
      .from(imageOperation)
      .where(and(...conditions));

    const total = allImages.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images - Upload a new image
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Upload to R2
    const folder = `uploads/${session.user.id}`;
    const uploadResult = await uploadFile(
      await file.arrayBuffer().then((ab) => Buffer.from(ab)),
      file.name,
      {
        folder,
        contentType: file.type,
      }
    );

    // Create database record
    const db = await getDb();
    const id = uuidv4();

    await db.insert(imageOperation).values({
      id,
      userId: session.user.id,
      operationType: "upload",
      outputUrl: uploadResult.publicUrl,
      outputKey: uploadResult.key,
      outputSize: uploadResult.size,
      status: "completed",
    });

    // Fetch the created record
    const [created] = await db
      .select()
      .from(imageOperation)
      .where(eq(imageOperation.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      image: created,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images - Delete multiple images (bulk delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No image IDs provided" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify ownership and get keys for R2 deletion
    const images = await db
      .select()
      .from(imageOperation)
      .where(
        and(
          inArray(imageOperation.id, ids),
          eq(imageOperation.userId, session.user.id)
        )
      );

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images found" },
        { status: 404 }
      );
    }

    // Delete from R2 (import deleteFile dynamically to avoid issues)
    const { deleteFile } = await import("@/lib/services/s3");
    const deletePromises = images.map((img) =>
      deleteFile(img.outputKey).catch((err) => {
        console.error(`Failed to delete ${img.outputKey} from R2:`, err);
        // Continue even if R2 delete fails
      })
    );
    await Promise.all(deletePromises);

    // Delete from database
    await db
      .delete(imageOperation)
      .where(
        and(
          inArray(imageOperation.id, ids),
          eq(imageOperation.userId, session.user.id)
        )
      );

    return NextResponse.json({
      success: true,
      deleted: images.length,
    });
  } catch (error) {
    console.error("Error deleting images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
