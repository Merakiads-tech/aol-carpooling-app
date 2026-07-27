import { Car } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { GoogleButton } from "./google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Car className="size-8" aria-hidden />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {APP_CONFIG.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{APP_CONFIG.tagline}</p>

        <div className="mt-8">
          <GoogleButton next={next} />
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          We only use your Google account to sign you in. You&apos;ll add your
          phone and photo next.
        </p>
      </div>
    </main>
  );
}
