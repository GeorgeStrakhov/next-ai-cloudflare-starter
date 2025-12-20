import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { removeBackground } from "@/lib/services/replicate/replicate";

interface RemoveBgRequest {
  imageId: string; // ID of image operation to process
}

/**
 * POST /api/images/remove-bg - Remove background from an image
 * Returns immediately with pending status, processing continues in background
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = (await request.json()) as RemoveBgRequest;
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = session.user.id;

    // Verify ownership and get image URL
    const [sourceImage] = await db
      .select()
      .from(imageOperation)
      .where(
        and(
          eq(imageOperation.id, imageId),
          eq(imageOperation.userId, userId),
          eq(imageOperation.status, "completed")
        )
      )
      .limit(1);

    if (!sourceImage) {
      return NextResponse.json(
        { error: "Image not found or not completed" },
        { status: 404 }
      );
    }

    const id = uuidv4();
    const sourceUrl = sourceImage.outputUrl;

    // Create pending record
    await db.insert(imageOperation).values({
      id,
      userId,
      operationType: "remove_bg",
      model: "bria/remove-background",
      inputImageIds: JSON.stringify([imageId]),
      outputUrl: "",
      outputKey: "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the pending record to return immediately
    const [pendingImage] = await db
      .select()
      .from(imageOperation)
      .where(eq(imageOperation.id, id))
      .limit(1);

    // Start background removal in background using waitUntil
    const { ctx } = await getCloudflareContext();
    ctx.waitUntil(
      (async () => {
        try {
          const result = await removeBackground({
            imageUrl: sourceUrl,
            folder: `background-removed/${userId}`,
          });

          await db
            .update(imageOperation)
            .set({
              outputUrl: result.imageUrl,
              outputKey: result.key,
              outputSize: result.size,
              status: "completed",
              updatedAt: new Date(),
            })
            .where(eq(imageOperation.id, id));
        } catch (bgError) {
          console.error("Background removal failed:", bgError);
          await db
            .update(imageOperation)
            .set({
              status: "failed",
              errorMessage:
                bgError instanceof Error
                  ? bgError.message
                  : "Background removal failed",
              updatedAt: new Date(),
            })
            .where(eq(imageOperation.id, id));
        }
      })()
    );

    // Return pending record immediately
    return NextResponse.json({
      success: true,
      image: pendingImage,
    });
  } catch (error) {
    console.error("Background removal error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Background removal failed",
      },
      { status: 500 }
    );
  }
}
