import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
} from "@/lib/access-control";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

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
    const { session, error } = await requireAdmin();
    if (error) return error;

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
    const { error } = await requireAdmin();
    if (error) return error;

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
