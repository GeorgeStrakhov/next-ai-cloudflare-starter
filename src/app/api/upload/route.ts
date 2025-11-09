import { NextRequest, NextResponse } from "next/server";
import { createAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/services/s3";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 },
      );
    }

    // Upload all files to R2
    const uploadPromises = files.map(async (file) => {
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to R2
      const result = await uploadFile(buffer, file.name, {
        folder: `user-uploads/${session.user.id}`,
        contentType: file.type,
      });

      return {
        filename: file.name,
        url: result.publicUrl,
        key: result.key,
        size: result.size,
      };
    });

    const uploads = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      uploads,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
