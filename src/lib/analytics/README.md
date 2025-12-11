# Analytics

Privacy-first analytics system with support for multiple providers. Analytics only loads after the user accepts cookies.

## Quick Start

```typescript
import { track, AnalyticsEvents } from "@/lib/analytics";

// Track an event
track(AnalyticsEvents.BUTTON_CLICKED, { buttonId: "signup" });

// Or use the hook in React components
import { useAnalytics } from "@/lib/analytics";

function MyComponent() {
  const { track, identify, reset } = useAnalytics();

  const handleClick = () => {
    track(AnalyticsEvents.FEATURE_USED, { featureName: "export" });
  };
}
```

## Configuration

Set environment variables in `.env.local` (or `.dev.vars` for Cloudflare):

```bash
# Google Analytics 4 (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
# Must match your project region: https://us.i.posthog.com (US) or https://eu.i.posthog.com (EU)
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Environment (affects which providers load)
NEXT_PUBLIC_APP_ENV=development  # or "staging" or "production"
```

**Behavior:**
- **Development**: Console provider only (logs to browser console)
- **Production**: GA + PostHog (only if configured)
- Missing env vars = that provider is skipped (no errors)

## Adding Custom Events

1. Add the event name to `events.ts`:

```typescript
export const AnalyticsEvents = {
  // ... existing events

  // Your new event
  CHECKOUT_STARTED: "checkout_started",
} as const;
```

2. Add type-safe properties:

```typescript
export interface EventProperties {
  // ... existing properties

  [AnalyticsEvents.CHECKOUT_STARTED]: {
    cartTotal?: number;
    itemCount?: number;
    currency?: string;
  };
}
```

3. Use it:

```typescript
track(AnalyticsEvents.CHECKOUT_STARTED, {
  cartTotal: 99.99,
  itemCount: 3,
  currency: "USD",
});
```

## Adding New Providers

### Step 1: Create the Provider

Create a new file in `providers/`, e.g., `providers/amplitude.ts`:

```typescript
"use client";

import type { AnalyticsProvider } from "./types";

// Import the provider's SDK
// import * as amplitude from "@amplitude/analytics-browser";

export interface AmplitudeConfig {
  apiKey: string;
  debug?: boolean;
}

export function amplitudeProvider(config: AmplitudeConfig): AnalyticsProvider {
  return {
    name: "amplitude",

    init() {
      if (typeof window === "undefined") return;

      // Initialize the SDK
      // amplitude.init(config.apiKey, {
      //   defaultTracking: false,
      //   logLevel: config.debug ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.None,
      // });
    },

    track(event: string, properties?: Record<string, unknown>) {
      // amplitude.track(event, properties);
    },

    identify(userId: string, traits?: Record<string, unknown>) {
      // amplitude.setUserId(userId);
      // if (traits) {
      //   const identifyEvent = new amplitude.Identify();
      //   Object.entries(traits).forEach(([key, value]) => {
      //     identifyEvent.set(key, value);
      //   });
      //   amplitude.identify(identifyEvent);
      // }
    },

    page(name?: string, properties?: Record<string, unknown>) {
      // amplitude.track("Page Viewed", { page_name: name, ...properties });
    },

    reset() {
      // amplitude.reset();
    },
  };
}
```

### Step 2: Export the Provider

Add to `providers/index.ts`:

```typescript
export { amplitudeProvider, type AmplitudeConfig } from "./amplitude";
```

### Step 3: Add Environment Variables

Update `.env.example`:

```bash
# Amplitude (optional)
NEXT_PUBLIC_AMPLITUDE_KEY=your-amplitude-api-key
```

### Step 4: Register the Provider

Update `components/analytics-provider.tsx`:

```typescript
// Add at the top
const AMPLITUDE_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_KEY;
const hasAmplitude = !!AMPLITUDE_KEY;

// In the useEffect, add:
if (hasAmplitude && !isDev) {
  providers.push(
    amplitudeProvider({
      apiKey: AMPLITUDE_KEY!,
      debug: false,
    })
  );
}
```

### Step 5: Install the SDK

```bash
pnpm add @amplitude/analytics-browser
```

## Provider Interface

All providers must implement this interface:

```typescript
interface AnalyticsProvider {
  name: string;
  init(): void | Promise<void>;
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name?: string, properties?: Record<string, unknown>): void;
  reset(): void;
}
```

## Architecture

```
analytics/
├── index.ts              # Public API exports
├── tracker.ts            # Singleton that manages all providers
├── events.ts             # Event definitions with TypeScript types
├── hooks.ts              # React hooks (useAnalytics, useIdentifyUser)
├── components/
│   └── analytics-provider.tsx  # Initializes providers, tracks pages/auth
└── providers/
    ├── types.ts          # AnalyticsProvider interface
    ├── posthog.ts        # PostHog implementation
    └── console.ts        # Console logging (development)
```

## Common Providers to Add

| Provider | SDK Package | Docs |
|----------|-------------|------|
| Amplitude | `@amplitude/analytics-browser` | [docs](https://amplitude.com/docs/sdks/analytics/browser/browser-sdk-2) |
| Mixpanel | `mixpanel-browser` | [docs](https://developer.mixpanel.com/docs/javascript-quickstart) |
| Segment | `@segment/analytics-next` | [docs](https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/) |
| Heap | `@heap/heap-node-sdk` | [docs](https://developers.heap.io/docs/web) |
| Plausible | No SDK needed (script tag) | [docs](https://plausible.io/docs) |
| Fathom | `fathom-client` | [docs](https://usefathom.com/docs) |

## Tips

1. **Error Handling**: Each provider is wrapped in try-catch, so one failing provider won't break others.

2. **Event Queuing**: Events tracked before initialization are queued and replayed once providers are ready.

3. **SSR Safety**: Always check `typeof window !== "undefined"` in provider `init()`.

4. **Debug Mode**: Set `NEXT_PUBLIC_APP_ENV=development` to see console logs of all events.

5. **Cookie Consent**: Analytics only loads after user accepts cookies (handled by `ConditionalAnalytics` in `providers.tsx`).
