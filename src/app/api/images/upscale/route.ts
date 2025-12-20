import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { upscaleImage } from "@/lib/services/replicate/replicate";

interface UpscaleRequest {
  imageId: string; // ID of image operation to upscale
  model?: string;
}

/**
 * POST /api/images/upscale - Upscale an image using AI
 * Returns immediately with pending status, upscaling continues in background
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = (await request.json()) as UpscaleRequest;
    const { imageId, model = "topaz-image-upscaler" } = body;

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
      operationType: "upscale",
      model,
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

    // Start upscaling in background using waitUntil
    const { ctx } = await getCloudflareContext();
    ctx.waitUntil(
      (async () => {
        try {
          const result = await upscaleImage({
            imageUrl: sourceUrl,
            model,
            folder: `upscaled-images/${userId}`,
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
        } catch (upscaleError) {
          console.error("Background upscale failed:", upscaleError);
          await db
            .update(imageOperation)
            .set({
              status: "failed",
              errorMessage:
                upscaleError instanceof Error
                  ? upscaleError.message
                  : "Upscale failed",
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
    console.error("Upscale error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upscale failed",
      },
      { status: 500 }
    );
  }
}
