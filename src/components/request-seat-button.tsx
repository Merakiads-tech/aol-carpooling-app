"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestSeatAction } from "@/app/(app)/rides/actions";

export function RequestSeatButton({
  rideId,
  seatsLeft,
}: {
  rideId: string;
  seatsLeft: number;
}) {
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState(1);
  const [pending, start] = useTransition();
  const max = Math.max(1, Math.min(seatsLeft, 6));

  function submit() {
    start(async () => {
      const res = await requestSeatAction(rideId, seats);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Request sent — the driver will get back to you.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90">
          Request Seat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>How many seats?</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-6 py-4">
          <button
            type="button"
            aria-label="Fewer seats"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            disabled={seats <= 1}
            className="flex size-11 items-center justify-center rounded-full border hover:bg-accent disabled:opacity-40"
          >
            <Minus className="size-5" />
          </button>
          <div className="flex min-w-16 flex-col items-center">
            <span className="text-4xl font-semibold tabular-nums">{seats}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserRound className="size-3" /> {seats === 1 ? "seat" : "seats"}
            </span>
          </div>
          <button
            type="button"
            aria-label="More seats"
            onClick={() => setSeats((s) => Math.min(max, s + 1))}
            disabled={seats >= max}
            className="flex size-11 items-center justify-center rounded-full border hover:bg-accent disabled:opacity-40"
          >
            <Plus className="size-5" />
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} available on this ride
        </p>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending}
            className="w-full bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Request {seats} {seats === 1 ? "seat" : "seats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
