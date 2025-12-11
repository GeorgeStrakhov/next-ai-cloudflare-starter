"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { analytics } from "../tracker";
import { AnalyticsEvents } from "../events";
import { posthogProvider, consoleProvider } from "../providers";
import { useSession } from "@/lib/auth-client";
import { env } from "@/lib/config";

// Environment variables
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const isDev = env.isDevelopment;
const hasGA = !!GA_MEASUREMENT_ID;
const hasPostHog = !!POSTHOG_KEY && !!POSTHOG_HOST;

/**
 * Analytics Provider Component
 *
 * Initializes analytics providers and handles:
 * - Page view tracking on route changes
 * - User identification on auth state changes
 * - Sign in/out event tracking
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const lastPathRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Initialize analytics on mount
  useEffect(() => {
    const providers = [];

    // Development: Console provider only
    if (isDev) {
      providers.push(consoleProvider({ prefix: "Analytics", styled: true }));
    }

    // Production: Add PostHog if configured
    if (hasPostHog && !isDev) {
      providers.push(
        posthogProvider({
          apiKey: POSTHOG_KEY!,
          apiHost: POSTHOG_HOST!,
          debug: false,
        })
      );
    }

    analytics.init({
      debug: isDev,
      providers,
      gaEnabled: hasGA && !isDev,
    });
  }, []);

  // Track page views on route change
  useEffect(() => {
    const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Avoid duplicate page views
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;

    analytics.page(pathname, {
      path,
      search: searchParams?.toString(),
    });
  }, [pathname, searchParams]);

  // Handle auth state changes
  useEffect(() => {
    const user = session?.user;
    const userId = user?.id;

    // User signed in
    if (userId && userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;

      // Identify user
      analytics.identify(userId, {
        email: user.email,
        name: user.name,
      });

      // Track sign in event
      analytics.track(AnalyticsEvents.SIGN_IN, {
        method: "magic_link", // Better Auth default
      });
    }

    // User signed out
    if (!userId && lastUserIdRef.current) {
      analytics.track(AnalyticsEvents.SIGN_OUT, {});
      analytics.reset();
      lastUserIdRef.current = null;
    }
  }, [session]);

  // Render Google Analytics component if configured
  if (hasGA && !isDev) {
    return <GoogleAnalytics gaId={GA_MEASUREMENT_ID!} />;
  }

  return null;
}
