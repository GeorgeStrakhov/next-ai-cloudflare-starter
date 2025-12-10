"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

const CONSENT_KEY = "cookie-consent";
const COOKIES_REQUIRED_PATH = "/cookies-required";

// Pages that don't require cookie consent (public/legal pages)
const EXEMPT_PATHS = [
  "/cookies-required",
  "/privacy",
  "/terms",
];

type ConsentStatus = "pending" | "accepted" | "declined";

interface CookieConsentContextType {
  consentStatus: ConsentStatus;
  acceptCookies: () => void;
  declineCookies: () => void;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}

interface CookieConsentProviderProps {
  children: ReactNode;
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load consent status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted") {
      setConsentStatus("accepted");
    } else if (stored === "declined") {
      setConsentStatus("declined");
    }
    setIsHydrated(true);
  }, []);

  // Redirect to cookies-required page if declined and not on exempt path
  useEffect(() => {
    if (!isHydrated) return;

    const isExemptPath = EXEMPT_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (consentStatus === "declined" && !isExemptPath) {
      router.push(COOKIES_REQUIRED_PATH);
    }
  }, [consentStatus, pathname, router, isHydrated]);

  const acceptCookies = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsentStatus("accepted");
  }, []);

  const declineCookies = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsentStatus("declined");
    router.push(COOKIES_REQUIRED_PATH);
  }, [router]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsentStatus("pending");
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consentStatus,
        acceptCookies,
        declineCookies,
        resetConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}
