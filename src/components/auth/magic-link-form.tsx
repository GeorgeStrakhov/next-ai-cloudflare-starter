"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface MagicLinkFormProps {
  heading?: string;
  logo?: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  buttonText?: string;
  callbackURL?: string;
}

export function MagicLinkForm({
  heading = "Sign in to your account",
  logo,
  buttonText = "Send magic link",
  callbackURL = "/dashboard",
}: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL,
      });

      if (error) {
        setError(error.message || "Failed to send magic link");
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="bg-muted min-h-screen">
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
            {logo && (
              <a href={logo.url}>
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-8 sm:h-10 w-auto dark:invert"
                  width={160}
                  height={40}
                  priority
                  unoptimized
                />
              </a>
            )}
            <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-4 sm:px-6 py-6 sm:py-8 shadow-md mx-4">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold mb-2">
                  Check your email
                </h2>
                <p className="text-muted-foreground text-sm break-all">
                  We sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Click the link in the email to sign in.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="text-primary text-sm hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
          {logo && (
            <a href={logo.url}>
              <Image
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-8 sm:h-10 w-auto dark:invert"
                width={160}
                height={40}
                priority
                unoptimized
              />
            </a>
          )}
          <form
            onSubmit={handleSubmit}
            className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-4 sm:px-6 py-6 sm:py-8 shadow-md mx-4"
          >
            {heading && (
              <h1 className="text-lg sm:text-xl font-semibold">{heading}</h1>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive w-full rounded-md p-3 text-sm break-words">
                {error}
              </div>
            )}

            <Input
              type="email"
              placeholder="Email"
              className="text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : buttonText}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
