"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/date-field";
import { cn } from "@/lib/utils";
import type { RideDirection } from "@/lib/types";

export function FilterBar({
  eventName,
  isFemale,
  direction,
  date,
  today,
  womenOnly,
}: {
  eventName: string;
  isFemale: boolean;
  direction: RideDirection;
  date: string;
  today: string;
  womenOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) sp.set(k, v);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SegBtn
          active={direction === "to_event"}
          onClick={() => update({ direction: "to_event" })}
        >
          To {eventName}
        </SegBtn>
        <SegBtn
          active={direction === "from_event"}
          onClick={() => update({ direction: "from_event" })}
        >
          From {eventName}
        </SegBtn>
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <DateField
          value={date}
          today={today}
          onChange={(v) => update({ date: v })}
        />
      </div>

      {isFemale && (
        <label className="flex items-center justify-between rounded-lg border bg-[var(--female)]/5 px-3 py-2.5">
          <span className="text-sm font-medium">Women drivers only</span>
          <Switch
            checked={womenOnly}
            onCheckedChange={(v) => update({ women: v ? "1" : "0" })}
          />
        </label>
      )}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border py-2.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
