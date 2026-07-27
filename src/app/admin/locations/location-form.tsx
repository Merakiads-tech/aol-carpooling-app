"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventLocation } from "@/lib/types";
import { saveLocationAction, type LocationState } from "./actions";

export function LocationForm({
  initial,
  onDone,
}: {
  initial?: EventLocation | null;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<LocationState, FormData>(
    saveLocationAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(initial ? "Location updated." : "Location added.");
      onDone?.();
    }
  }, [state.ok, initial, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          placeholder="Hariwan Ashram"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          defaultValue={initial?.address ?? ""}
          placeholder="Area / city"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            name="lat"
            type="number"
            step="any"
            defaultValue={initial?.lat ?? ""}
            placeholder="30.7333"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            name="lng"
            type="number"
            step="any"
            defaultValue={initial?.lng ?? ""}
            placeholder="76.7794"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maps_url">Google Maps link</Label>
        <Input
          id="maps_url"
          name="maps_url"
          defaultValue={initial?.maps_url ?? ""}
          placeholder="https://maps.app.goo.gl/…"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Save changes" : "Add location"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
