import Image from "next/image";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="absolute top-4 right-4">
        <ModeToggle />
      </header>
      <main className="flex flex-col items-center justify-center flex-1 px-4">
        <Image
          src="/logo.svg"
          alt={appConfig.name}
          width={100}
          height={100}
          className="mb-6 sm:mb-8 w-16 h-16 sm:w-24 sm:h-24"
        />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center font-heading">
          {appConfig.name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 sm:mt-6 text-center max-w-md px-4">
          {appConfig.description}
        </p>
        <Link href="/sign-in" className="mt-6 sm:mt-8">
          <Button size="lg">Sign In</Button>
        </Link>
      </main>
      <footer className="py-6 px-4 text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="text-muted-foreground/50">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
