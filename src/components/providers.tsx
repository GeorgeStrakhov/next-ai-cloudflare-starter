"use client";

import { type ReactNode, Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsentProvider, useCookieConsent } from "@/lib/cookie-consent";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { AnalyticsProvider } from "@/lib/analytics";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Analytics wrapper that only loads analytics when cookies are accepted
 */
function ConditionalAnalytics() {
  const { consentStatus } = useCookieConsent();

  // Only initialize analytics if user has accepted cookies
  if (consentStatus !== "accepted") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AnalyticsProvider />
    </Suspense>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <CookieConsentProvider>
        {children}
        <CookieConsentBanner />
        <ConditionalAnalytics />
      </CookieConsentProvider>
    </ThemeProvider>
  );
}
