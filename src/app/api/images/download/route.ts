import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL is from our CDN
  const allowedHosts = [
    process.env.NEXT_PUBLIC_S3_ENDPOINT,
    process.env.S3_PUBLIC_ENDPOINT,
  ].filter(Boolean);

  const parsedUrl = new URL(url);
  const isAllowed = allowedHosts.some((host) => {
    if (!host) return false;
    try {
      const allowedUrl = new URL(host);
      return parsedUrl.hostname === allowedUrl.hostname;
    } catch {
      return false;
    }
  });

  if (!isAllowed) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();

    // Extract filename from URL
    const pathname = parsedUrl.pathname;
    const filename = pathname.split("/").pop() || "image.png";

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
