"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";
import { useCookieConsent } from "@/lib/cookie-consent";
import { useRouter } from "next/navigation";

export default function CookiesRequiredPage() {
  const { consentStatus, acceptCookies, resetConsent } = useCookieConsent();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If user accepts cookies, redirect to home
  useEffect(() => {
    if (mounted && consentStatus === "accepted") {
      router.push("/");
    }
  }, [consentStatus, router, mounted]);

  const handleAcceptCookies = () => {
    acceptCookies();
    router.push("/");
  };

  const handleTryAgain = () => {
    resetConsent();
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <Image
        src="/logo.svg"
        alt={appConfig.name}
        width={80}
        height={80}
        className="mb-6 w-16 h-16 opacity-50"
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-4">
        Cookies Required
      </h1>

      <div className="max-w-md text-muted-foreground space-y-4 mb-8">
        <p>
          We&apos;re sorry, but {appConfig.name} requires cookies to function properly.
        </p>
        <p>
          Cookies are essential for authentication, remembering your preferences,
          and providing you with a secure experience.
        </p>
        <p className="text-sm">
          We respect your privacy and only use cookies that are necessary for the
          service to work. You can review our{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          for more details.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleAcceptCookies}>
          Accept Cookies & Continue
        </Button>
        <Button variant="outline" onClick={handleTryAgain}>
          Go Back
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        If you have questions, contact us at{" "}
        <a
          href={`mailto:${appConfig.email}`}
          className="underline hover:text-foreground"
        >
          {appConfig.email}
        </a>
      </p>
    </div>
  );
}
