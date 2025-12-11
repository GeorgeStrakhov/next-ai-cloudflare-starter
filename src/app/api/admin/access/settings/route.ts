import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAuthSettings, setAuthSettings } from "@/lib/access-control";
import type { AuthSettings } from "@/db/schema";

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
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterIsAdmin = await isAdmin(session.user.email);
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
