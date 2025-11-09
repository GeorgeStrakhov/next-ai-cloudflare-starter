import { createAuth } from "@/lib/auth";

// Export the Better Auth handler for all auth routes
// This handles: /api/auth/sign-in/magic-link, /api/auth/callback, etc.
export async function GET(request: Request) {
  const auth = await createAuth();
  return auth.handler(request);
}

export async function POST(request: Request) {
  const auth = await createAuth();
  return auth.handler(request);
}
