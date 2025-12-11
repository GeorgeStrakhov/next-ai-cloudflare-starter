import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  getAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
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

    const emails = await getAllowedEmails();
    return NextResponse.json(emails);
  } catch (error) {
    console.error("Error fetching allowed emails:", error);
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

    const body = (await request.json()) as { email?: string; note?: string };
    const { email, note } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    await addAllowedEmail(email, note, session.user.email);

    return NextResponse.json({ success: true, email: email.toLowerCase() });
  } catch (error) {
    console.error("Error adding allowed email:", error);
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

    const body = (await request.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await removeAllowedEmail(email);

    return NextResponse.json({ success: true, email: email.toLowerCase() });
  } catch (error) {
    console.error("Error removing allowed email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
