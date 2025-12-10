"use client";

import { useCallback } from "react";
import { analytics } from "./tracker";
import type { AnalyticsEvent, EventProperties } from "./events";

/**
 * Main analytics hook
 *
 * Provides type-safe access to analytics tracking methods.
 */
export function useAnalytics() {
  const track = useCallback(
    <E extends AnalyticsEvent>(
      event: E,
      properties?: E extends keyof EventProperties
        ? EventProperties[E]
        : Record<string, unknown>
    ) => {
      analytics.track(event, properties);
    },
    []
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      analytics.identify(userId, traits);
    },
    []
  );

  const page = useCallback(
    (name?: string, properties?: Record<string, unknown>) => {
      analytics.page(name, properties);
    },
    []
  );

  const reset = useCallback(() => {
    analytics.reset();
  }, []);

  return { track, identify, page, reset };
}

/**
 * Convenience hook for identifying users
 *
 * Returns a function that identifies the current user with traits.
 */
export function useIdentifyUser() {
  const { identify } = useAnalytics();

  return useCallback(
    (
      userId: string,
      traits?: {
        email?: string;
        name?: string;
        [key: string]: unknown;
      }
    ) => {
      identify(userId, traits);
    },
    [identify]
  );
}
