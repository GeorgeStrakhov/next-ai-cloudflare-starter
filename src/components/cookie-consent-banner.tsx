"use client";

import { useCookieConsent } from "@/lib/cookie-consent";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CookieConsentBanner() {
  const { consentStatus, acceptCookies, declineCookies } = useCookieConsent();

  // Don't show banner if consent already given or declined
  if (consentStatus !== "pending") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground text-center sm:text-left">
          <p>
            We use cookies to ensure the best experience on our site. By
            continuing to use this site, you agree to our use of cookies.{" "}
            <Link
              href="/privacy"
              className="underline hover:text-foreground"
            >
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={declineCookies}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={acceptCookies}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
