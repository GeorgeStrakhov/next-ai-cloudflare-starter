import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { uploadFile } from "@/lib/services/s3";
import { getImageDimensions, getClosestAspectRatio } from "@/lib/image-utils";
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
    const favoritesOnly = searchParams.get("favorites") === "true";

    const db = await getDb();

    // Build query conditions
    const conditions = [
      eq(imageOperation.userId, session.user.id),
      eq(imageOperation.hidden, false), // Exclude soft-deleted images
    ];

    if (filter && filter !== "all") {
      conditions.push(eq(imageOperation.operationType, filter));
    }

    if (favoritesOnly) {
      conditions.push(eq(imageOperation.favorite, true));
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

    // Get buffer for upload and dimension detection
    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect image dimensions and map to closest aspect ratio
    const dimensions = getImageDimensions(buffer);
    const aspectRatio = dimensions
      ? getClosestAspectRatio(dimensions.width, dimensions.height)
      : "1:1"; // Default to square if detection fails

    // Upload to R2
    const folder = `uploads/${session.user.id}`;
    const uploadResult = await uploadFile(buffer, file.name, {
      folder,
      contentType: file.type,
    });

    // Create database record
    const db = await getDb();
    const id = uuidv4();

    await db.insert(imageOperation).values({
      id,
      userId: session.user.id,
      operationType: "upload",
      aspectRatio,
      outputUrl: uploadResult.publicUrl,
      outputKey: uploadResult.key,
      outputSize: uploadResult.size,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
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
 * DELETE /api/images - Soft delete multiple images (hide from gallery)
 * Images are hidden but R2 files remain (for chat references, etc.)
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

    // Verify ownership
    const images = await db
      .select({ id: imageOperation.id })
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

    // Soft delete - set hidden flag instead of deleting
    await db
      .update(imageOperation)
      .set({ hidden: true, updatedAt: new Date() })
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
