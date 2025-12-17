import { NextResponse } from "next/server";
import { requireAdmin, isAdmin, addAdminEmail, removeAdminEmail } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    // Get email from request body
    const body = (await request.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Prevent removing yourself as admin
    if (
      normalizedEmail === session.user.email.toLowerCase() &&
      (await isAdmin(normalizedEmail))
    ) {
      return NextResponse.json(
        { error: "You cannot remove your own admin access" },
        { status: 400 }
      );
    }

    // Toggle admin status
    const currentlyAdmin = await isAdmin(normalizedEmail);

    if (currentlyAdmin) {
      await removeAdminEmail(normalizedEmail);
    } else {
      await addAdminEmail(normalizedEmail);
    }

    return NextResponse.json({
      success: true,
      isAdmin: !currentlyAdmin,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Error toggling admin status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
