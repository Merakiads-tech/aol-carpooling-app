import Link from "next/link";
import { Car, LogOut, Shield } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAdminEmail } from "@/lib/admin";
import type { Profile } from "@/lib/types";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-4.5" aria-hidden />
          </span>
          {APP_CONFIG.name}
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {isAdminEmail(profile.email) && (
            <Link
              href="/admin"
              aria-label="Admin dashboard"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Shield className="size-4.5" aria-hidden />
            </Link>
          )}
          <Avatar className="size-8">
            <AvatarImage src={profile.photo_url ?? undefined} alt="" />
            <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4.5" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
