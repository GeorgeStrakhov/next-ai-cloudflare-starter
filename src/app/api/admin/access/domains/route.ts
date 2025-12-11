import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  getAllowedDomains,
  addAllowedDomain,
  removeAllowedDomain,
} from "@/lib/access-control";

export async function GET() {
  try {
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterIsAdmin = await isAdmin(session.user.email);
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterIsAdmin = await isAdmin(session.user.email);
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterIsAdmin = await isAdmin(session.user.email);
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
