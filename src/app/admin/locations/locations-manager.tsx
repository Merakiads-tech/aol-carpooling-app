"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { EventLocation } from "@/lib/types";
import { LocationForm } from "./location-form";
import { toggleLocationAction } from "./actions";

export function LocationsManager({
  locations,
}: {
  locations: EventLocation[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {locations.length} location{locations.length === 1 ? "" : "s"}
        </h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border bg-card p-4">
          <LocationForm onDone={() => setAdding(false)} />
        </div>
      )}

      <ul className="space-y-2">
        {locations.map((loc) =>
          editingId === loc.id ? (
            <li key={loc.id} className="rounded-xl border bg-card p-4">
              <LocationForm
                initial={loc}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={loc.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{loc.name}</p>
                  {loc.address && (
                    <p className="text-sm text-muted-foreground">
                      {loc.address}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {loc.lat != null && loc.lng != null && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {Number(loc.lat).toFixed(4)},{" "}
                        {Number(loc.lng).toFixed(4)}
                      </span>
                    )}
                    {loc.maps_url && (
                      <a
                        href={loc.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary"
                      >
                        <ExternalLink className="size-3" /> Map
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingId(loc.id)}
                  aria-label="Edit"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border hover:bg-accent"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Active</span>
                <ActiveToggle id={loc.id} active={loc.is_active} />
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      onCheckedChange={(v) =>
        start(async () => {
          const res = await toggleLocationAction(id, v);
          if (res.error) toast.error(res.error);
        })
      }
    />
  );
}
