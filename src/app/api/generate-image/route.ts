import { NextRequest, NextResponse } from "next/server";
import { createAuth } from "@/lib/auth";
import { generateImage } from "@/lib/services/replicate/replicate";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prompt from request body
    const body = await request.json();
    const { prompt, model, aspectRatio } = body as {
      prompt: string;
      model?: string;
      aspectRatio?: string;
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    // Generate image using Replicate with selected model and aspect ratio
    const result = await generateImage({
      prompt: prompt.trim(),
      model: model || "imagen-4-ultra",
      aspectRatio: (aspectRatio as "1:1" | "16:9" | "9:16" | undefined) || "1:1",
      folder: `generated-images/${session.user.id}`,
    });

    return NextResponse.json({
      success: true,
      image: {
        url: result.imageUrl,
        key: result.key,
        size: result.size,
        prompt,
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 500 },
    );
  }
}
