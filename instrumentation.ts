// This file is used to register instrumentation hooks for Next.js
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side Sentry initialization
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime Sentry initialization (Cloudflare Workers)
    await import("./sentry.server.config");
  }
}

export const onRequestError = async (
  error: Error,
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: "react-server-components" | "react-server-components-payload";
    revalidateReason?: "on-demand" | "stale";
    renderType?: "static" | "dynamic";
  }
) => {
  const Sentry = await import("@sentry/nextjs");

  Sentry.captureException(error, {
    extra: {
      request: {
        method: request.method,
        path: request.path,
      },
      context,
    },
  });
};
