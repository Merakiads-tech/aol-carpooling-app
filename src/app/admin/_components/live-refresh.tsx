"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Keeps the admin overview feeling live: re-fetches the server-rendered data
 * on an interval (and on demand) via router.refresh(), showing when it last
 * updated. The page itself is force-dynamic so each refresh returns fresh data.
 */
export function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      setUpdatedAt(new Date());
    });
  };

  useEffect(() => {
    // Stamp the initial load time asynchronously (the page is already fresh on
    // mount, so no refetch needed) — avoids a synchronous setState in the effect
    // body and any SSR/client time mismatch.
    const initial = setTimeout(() => setUpdatedAt(new Date()), 0);
    const id = setInterval(() => {
      startTransition(() => {
        router.refresh();
        setUpdatedAt(new Date());
      });
    }, intervalMs);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [router, intervalMs]);

  return (
    <button
      onClick={refresh}
      className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      title="Refresh now"
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full rounded-full bg-[var(--success)] opacity-75",
            !isPending && "animate-ping",
          )}
        />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--success)]" />
      </span>
      <span className="tabular-nums">
        {updatedAt
          ? `Live · updated ${updatedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`
          : "Live"}
      </span>
      <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
    </button>
  );
}
