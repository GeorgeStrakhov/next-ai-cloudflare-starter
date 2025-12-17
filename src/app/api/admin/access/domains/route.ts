import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getAllowedDomains,
  addAllowedDomain,
  removeAllowedDomain,
} from "@/lib/access-control";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const domains = await getAllowedDomains();
    return NextResponse.json(domains);
  } catch (error) {
    console.error("Error fetching allowed domains:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as { domain?: string; note?: string };
    const { domain, note } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Basic domain validation (remove @ if present, check format)
    const normalizedDomain = domain.toLowerCase().trim().replace(/^@/, "");
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    await addAllowedDomain(normalizedDomain, note, session.user.email);

    return NextResponse.json({ success: true, domain: normalizedDomain });
  } catch (error) {
    console.error("Error adding allowed domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as { domain?: string };
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    await removeAllowedDomain(domain);

    return NextResponse.json({ success: true, domain: domain.toLowerCase() });
  } catch (error) {
    console.error("Error removing allowed domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
