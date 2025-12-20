import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuth } from "@/lib/admin";
import { getDb, imageOperation } from "@/db";
import { generateImage } from "@/lib/services/replicate/replicate";

interface GenerateRequest {
  prompt: string;
  model?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

/**
 * POST /api/images/generate - Generate a new image using AI
 * Returns immediately with pending status, generation continues in background
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = (await request.json()) as GenerateRequest;
    const { prompt, model = "flux-schnell", aspectRatio = "1:1" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const id = uuidv4();
    const userId = session.user.id;
    const trimmedPrompt = prompt.trim();

    // Create pending record
    await db.insert(imageOperation).values({
      id,
      userId,
      operationType: "generate",
      model,
      prompt: trimmedPrompt,
      aspectRatio,
      outputUrl: "", // Will be updated when complete
      outputKey: "", // Will be updated when complete
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

    // Start generation in background using waitUntil
    const { ctx } = await getCloudflareContext();
    ctx.waitUntil(
      (async () => {
        try {
          const result = await generateImage({
            prompt: trimmedPrompt,
            model,
            aspectRatio,
            folder: `generated-images/${userId}`,
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
        } catch (genError) {
          console.error("Background generation failed:", genError);
          await db
            .update(imageOperation)
            .set({
              status: "failed",
              errorMessage:
                genError instanceof Error ? genError.message : "Generation failed",
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
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 500 }
    );
  }
}
