import { CarFront, MapPin } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { GoogleButton } from "./google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-6 py-10">
      {/* Hero */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CarFront className="size-5" aria-hidden />
          </span>
          <span className="font-display text-xl">{APP_CONFIG.name}</span>
        </div>

        <h1 className="mt-10 text-[40px] leading-[1.05]">
          Get there,
          <br />
          together.
        </h1>
        <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-muted-foreground">
          Community carpooling to Harivan Ashram. Ask a neighbour for the empty
          seat and ride along — no money ever changes hands.
        </p>

        {/* route motif */}
        <div className="mt-8 rounded-[22px] border bg-card p-5 shadow-[0_8px_30px_rgba(28,27,25,0.06)]">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground">
              <MapPin className="size-4" aria-hidden />
            </span>
            <span className="h-px flex-1 border-t-2 border-dashed border-[var(--gold)]/40" />
            <span className="flex size-11 items-center justify-center rounded-full bg-[var(--gold-soft)] text-[var(--gold-ink)]">
              <CarFront className="size-5" aria-hidden />
            </span>
            <span className="h-px flex-1 border-t-2 border-dashed border-[var(--gold)]/40" />
            <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
              <span className="size-2 rounded-full bg-[var(--gold)]" />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium">
            <span>Your pickup</span>
            <span className="text-muted-foreground">Harivan Ashram</span>
          </div>
        </div>
      </div>

      {/* Sign in */}
      <div className="pt-8">
        <GoogleButton next={next} />
        {error && (
          <p className="mt-3 text-center text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        )}
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          We only use your Google account to sign you in.
          <br />
          You&apos;ll add your phone and photo next.
        </p>
      </div>
    </main>
  );
}
