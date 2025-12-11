// This file configures client-side instrumentation (Sentry).
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Only enable Sentry if DSN is provided
  enabled: !!SENTRY_DSN,

  // Enable structured logging to Sentry
  enableLogs: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay is disabled by default - enable in Sentry dashboard if needed
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  integrations: [
    // Capture console.warn and console.error as logs in Sentry
    // Helps debug what happened before an error occurred
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
});

// Required for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
