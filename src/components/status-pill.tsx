import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "muted" | "warning";

const TONES: Record<Tone, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-[var(--success)]/10 text-[var(--success)]",
  muted: "bg-muted text-muted-foreground",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

export function StatusPill({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-lg px-3 py-2 text-center text-sm font-medium",
        TONES[tone],
      )}
    >
      {children}
    </div>
  );
}
