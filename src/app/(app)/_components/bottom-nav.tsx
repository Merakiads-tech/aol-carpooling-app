"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront, Home, PlusCircle, Search } from "lucide-react";
import { COPY } from "@/config/app";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/rides",
    label: COPY.navFind,
    icon: Search,
    match: (p: string) =>
      p === "/rides" || (p.startsWith("/rides/") && p !== "/rides/new"),
  },
  {
    href: "/rides/new",
    label: COPY.navOffer,
    icon: PlusCircle,
    match: (p: string) => p === "/rides/new",
  },
  {
    href: "/my-rides",
    label: "My Rides",
    icon: CarFront,
    match: (p: string) => p === "/my-rides" || p.startsWith("/my-rides/"),
    badge: true,
  },
];

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, icon: Icon, match, badge }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {badge && pendingCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
