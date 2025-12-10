"use client";

import { sendGAEvent } from "@next/third-parties/google";
import type { AnalyticsProvider, AnalyticsConfig } from "./providers/types";
import type { AnalyticsEvent, EventProperties } from "./events";

type QueuedEvent =
  | { type: "track"; event: string; properties?: Record<string, unknown> }
  | { type: "identify"; userId: string; traits?: Record<string, unknown> }
  | { type: "page"; name?: string; properties?: Record<string, unknown> }
  | { type: "reset" };

/**
 * Analytics Tracker
 *
 * Central hub for all analytics operations.
 * Distributes events to all registered providers.
 */
class AnalyticsTracker {
  private providers: AnalyticsProvider[] = [];
  private initialized = false;
  private debug = false;
  private eventQueue: QueuedEvent[] = [];
  private gaEnabled = false;

  init(config: AnalyticsConfig & { gaEnabled?: boolean }) {
    if (this.initialized) {
      this.log("Already initialized, skipping");
      return;
    }

    this.debug = config.debug ?? false;
    this.providers = config.providers;
    this.gaEnabled = config.gaEnabled ?? false;

    // Initialize all providers
    for (const provider of this.providers) {
      try {
        provider.init();
        this.log(`Initialized provider: ${provider.name}`);
      } catch (error) {
        console.error(`Failed to initialize provider ${provider.name}:`, error);
      }
    }

    this.initialized = true;
    this.log(
      `Analytics initialized with providers: ${this.providers.map((p) => p.name).join(", ")}`
    );

    // Process queued events
    this.processQueue();
  }

  private processQueue() {
    if (this.eventQueue.length === 0) return;

    this.log(`Processing ${this.eventQueue.length} queued events`);

    for (const event of this.eventQueue) {
      switch (event.type) {
        case "track":
          this.track(event.event, event.properties);
          break;
        case "identify":
          this.identify(event.userId, event.traits);
          break;
        case "page":
          this.page(event.name, event.properties);
          break;
        case "reset":
          this.reset();
          break;
      }
    }

    this.eventQueue = [];
  }

  /**
   * Track a custom event with type-safe properties
   */
  track<E extends AnalyticsEvent>(
    event: E,
    properties?: E extends keyof EventProperties
      ? EventProperties[E]
      : Record<string, unknown>
  ): void;
  track(event: string, properties?: Record<string, unknown>): void;
  track(event: string, properties?: Record<string, unknown>) {
    if (!this.initialized) {
      this.eventQueue.push({ type: "track", event, properties });
      return;
    }

    this.log(`Track: ${event}`, properties);

    // Send to Google Analytics
    if (this.gaEnabled) {
      try {
        sendGAEvent("event", event, properties ?? {});
      } catch (error) {
        console.error("Failed to send GA event:", error);
      }
    }

    // Send to all providers
    for (const provider of this.providers) {
      try {
        provider.track(event, properties);
      } catch (error) {
        console.error(`Provider ${provider.name} track failed:`, error);
      }
    }
  }

  /**
   * Identify a user with optional traits
   */
  identify(userId: string, traits?: Record<string, unknown>) {
    if (!this.initialized) {
      this.eventQueue.push({ type: "identify", userId, traits });
      return;
    }

    this.log(`Identify: ${userId}`, traits);

    for (const provider of this.providers) {
      try {
        provider.identify(userId, traits);
      } catch (error) {
        console.error(`Provider ${provider.name} identify failed:`, error);
      }
    }
  }

  /**
   * Track a page view
   */
  page(name?: string, properties?: Record<string, unknown>) {
    if (!this.initialized) {
      this.eventQueue.push({ type: "page", name, properties });
      return;
    }

    this.log(`Page: ${name || "unknown"}`, properties);

    for (const provider of this.providers) {
      try {
        provider.page(name, properties);
      } catch (error) {
        console.error(`Provider ${provider.name} page failed:`, error);
      }
    }
  }

  /**
   * Reset user identity (call on logout)
   */
  reset() {
    if (!this.initialized) {
      this.eventQueue.push({ type: "reset" });
      return;
    }

    this.log("Reset");

    for (const provider of this.providers) {
      try {
        provider.reset();
      } catch (error) {
        console.error(`Provider ${provider.name} reset failed:`, error);
      }
    }
  }

  isInitialized() {
    return this.initialized;
  }

  getProviders() {
    return this.providers.map((p) => p.name);
  }

  private log(message: string, data?: unknown) {
    if (this.debug) {
      console.log(`[Analytics] ${message}`, data ?? "");
    }
  }
}

// Singleton instance
export const analytics = new AnalyticsTracker();
