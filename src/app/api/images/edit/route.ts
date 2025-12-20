import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { editImage, getMaxImagesForModel } from "@/lib/services/replicate/replicate";

interface EditRequest {
  prompt: string;
  imageIds: string[]; // IDs of image operations to use as input
  model?: string;
  outputFormat?: "jpg" | "png" | "webp";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "match_input_image";
}

/**
 * POST /api/images/edit - Edit image(s) using AI
 * Returns immediately with pending status, editing continues in background
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = (await request.json()) as EditRequest;
    const {
      prompt,
      imageIds,
      model = "flux-kontext",
      outputFormat = "jpg",
      aspectRatio,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    // Validate image count for model
    const maxImages = getMaxImagesForModel(model);
    if (imageIds.length > maxImages) {
      return NextResponse.json(
        { error: `${model} supports maximum ${maxImages} image(s)` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = session.user.id;
    const trimmedPrompt = prompt.trim();

    // Verify ownership and get image URLs
    const sourceImages = await db
      .select()
      .from(imageOperation)
      .where(
        and(
          inArray(imageOperation.id, imageIds),
          eq(imageOperation.userId, userId),
          eq(imageOperation.status, "completed")
        )
      );

    if (sourceImages.length !== imageIds.length) {
      return NextResponse.json(
        { error: "One or more images not found or not completed" },
        { status: 404 }
      );
    }

    // Get image URLs in the order provided
    const imageUrls = imageIds.map((id) => {
      const img = sourceImages.find((i) => i.id === id);
      return img!.outputUrl;
    });

    const id = uuidv4();

    // Create pending record
    await db.insert(imageOperation).values({
      id,
      userId,
      operationType: "edit",
      model,
      prompt: trimmedPrompt,
      aspectRatio: aspectRatio || null,
      inputImageIds: JSON.stringify(imageIds),
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

    // Start editing in background using waitUntil
    const { ctx } = await getCloudflareContext();
    ctx.waitUntil(
      (async () => {
        try {
          const result = await editImage({
            prompt: trimmedPrompt,
            imageInputs: imageUrls,
            model,
            outputFormat,
            aspectRatio,
            folder: `edited-images/${userId}`,
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
        } catch (editError) {
          console.error("Background edit failed:", editError);
          await db
            .update(imageOperation)
            .set({
              status: "failed",
              errorMessage:
                editError instanceof Error ? editError.message : "Edit failed",
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
    console.error("Image edit error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Image edit failed",
      },
      { status: 500 }
    );
  }
}
