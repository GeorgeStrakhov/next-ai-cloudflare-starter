"use client";

import posthog from "posthog-js";
import type { AnalyticsProvider } from "./types";

export interface PostHogConfig {
  apiKey: string;
  apiHost: string;
  debug?: boolean;
}

/**
 * PostHog Analytics Provider
 *
 * Product analytics with event tracking, user identification,
 * session replay, and feature flags.
 */
export function posthogProvider(config: PostHogConfig): AnalyticsProvider {
  return {
    name: "posthog",

    init() {
      if (typeof window === "undefined") return;

      posthog.init(config.apiKey, {
        api_host: config.apiHost,
        capture_pageview: false, // We handle page views manually
        capture_pageleave: true,
        respect_dnt: true, // Respect Do Not Track browser setting
        debug: config.debug,
        persistence: "localStorage",
        autocapture: false, // Disable autocapture for cleaner data
      });
    },

    track(event: string, properties?: Record<string, unknown>) {
      posthog.capture(event, properties);
    },

    identify(userId: string, traits?: Record<string, unknown>) {
      posthog.identify(userId, traits);
    },

    page(name?: string, properties?: Record<string, unknown>) {
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        page_name: name,
        ...properties,
      });
    },

    reset() {
      posthog.reset();
    },
  };
}
