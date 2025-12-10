"use client";

import type { AnalyticsProvider } from "./types";

export interface ConsoleConfig {
  prefix?: string;
  styled?: boolean;
}

/**
 * Console Analytics Provider
 *
 * Logs all analytics events to the browser console.
 * Useful for development and debugging.
 */
export function consoleProvider(config?: ConsoleConfig): AnalyticsProvider {
  const prefix = config?.prefix ?? "Analytics";
  const styled = config?.styled ?? true;

  const styles = {
    track: "background: #8B5CF6; color: white; padding: 2px 6px; border-radius: 3px;",
    identify: "background: #06B6D4; color: white; padding: 2px 6px; border-radius: 3px;",
    page: "background: #10B981; color: white; padding: 2px 6px; border-radius: 3px;",
    reset: "background: #EF4444; color: white; padding: 2px 6px; border-radius: 3px;",
  };

  const log = (type: keyof typeof styles, message: string, data?: unknown) => {
    if (styled && typeof window !== "undefined") {
      console.log(
        `%c${prefix}%c ${type.toUpperCase()}: ${message}`,
        styles[type],
        "color: inherit;",
        data ?? ""
      );
    } else {
      console.log(`[${prefix}] ${type.toUpperCase()}: ${message}`, data ?? "");
    }
  };

  return {
    name: "console",

    init() {
      log("track", "Console provider initialized");
    },

    track(event: string, properties?: Record<string, unknown>) {
      log("track", event, properties);
    },

    identify(userId: string, traits?: Record<string, unknown>) {
      log("identify", userId, traits);
    },

    page(name?: string, properties?: Record<string, unknown>) {
      log("page", name ?? window.location.pathname, properties);
    },

    reset() {
      log("reset", "User identity cleared");
    },
  };
}
