import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAuthSettings, setAuthSettings } from "@/lib/access-control";
import type { AuthSettings } from "@/db/schema";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const settings = await getAuthSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching auth settings:", error);
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

    const body = (await request.json()) as Partial<AuthSettings>;
    const { mode } = body;

    if (!mode || !["open", "restricted"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'open' or 'restricted'" },
        { status: 400 }
      );
    }

    await setAuthSettings({ mode }, session.user.email);

    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error("Error updating auth settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
