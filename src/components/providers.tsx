"use client";

import { type ReactNode } from "react";
import { CookieConsentProvider } from "@/lib/cookie-consent";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <CookieConsentProvider>
      {children}
      <CookieConsentBanner />
    </CookieConsentProvider>
  );
}
