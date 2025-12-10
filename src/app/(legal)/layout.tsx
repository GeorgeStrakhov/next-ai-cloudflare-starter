import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { appConfig } from "@/lib/config";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {appConfig.name}
        </Link>
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </article>
        <footer className="mt-12 pt-8 border-t border-muted text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} {appConfig.name}. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
