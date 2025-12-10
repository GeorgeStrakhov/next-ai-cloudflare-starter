// Main analytics export
export { analytics } from "./tracker";

// Events
export { AnalyticsEvents, type AnalyticsEvent, type EventProperties } from "./events";

// Hooks
export { useAnalytics, useIdentifyUser } from "./hooks";

// Components
export { AnalyticsProvider } from "./components";

// Providers (for custom configurations)
export {
  type AnalyticsProvider as AnalyticsProviderInterface,
  type AnalyticsConfig,
  posthogProvider,
  consoleProvider,
} from "./providers";

// Convenience re-export for direct tracking
import { analytics } from "./tracker";
export const track = analytics.track.bind(analytics);
export const identify = analytics.identify.bind(analytics);
export const page = analytics.page.bind(analytics);
export const reset = analytics.reset.bind(analytics);
