import Image from "next/image";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <Image
        src="/logo.svg"
        alt={appConfig.name}
        width={100}
        height={100}
        className="mb-6 sm:mb-8 w-16 h-16 sm:w-24 sm:h-24"
      />
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center">
        {appConfig.name}
      </h1>
      <p className="text-sm sm:text-base text-gray-500 mt-4 sm:mt-6 text-center max-w-md px-4">
        {appConfig.description}
      </p>
      <Link href="/sign-in" className="mt-6 sm:mt-8">
        <Button size="lg">Sign In</Button>
      </Link>
    </div>
  );
}
