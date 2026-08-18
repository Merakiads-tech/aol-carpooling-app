"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";

export type PlaceValue = { label: string; lat: number | null; lng: number | null };

/* ── Minimal Google Maps typings (avoids pulling @types/google.maps) ── */
type GLatLng = { lat: () => number; lng: () => number };
type GPlace = { formatted_address?: string; name?: string; geometry?: { location?: GLatLng } };
type GAutocomplete = {
  getPlace: () => GPlace;
  addListener: (event: string, cb: () => void) => void;
};
type GMaps = {
  maps: {
    places: {
      Autocomplete: new (
        el: HTMLInputElement,
        opts: Record<string, unknown>,
      ) => GAutocomplete;
    };
  };
};

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let mapsPromise: Promise<GMaps | null> | null = null;

function loadGoogleMaps(): Promise<GMaps | null> {
  if (!KEY) return Promise.resolve(null);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve) => {
    const existing = (window as unknown as { google?: GMaps }).google;
    if (existing?.maps?.places) return resolve(existing);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async`;
    s.async = true;
    s.onload = () =>
      resolve((window as unknown as { google?: GMaps }).google ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return mapsPromise;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${lat}&lon=${lng}`,
    );
    const j = await r.json();
    return (
      (j.display_name as string | undefined)?.split(",").slice(0, 3).join(",").trim() ??
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function PlacesInput({
  value,
  onChange,
}: {
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [locating, setLocating] = useState(false);

  // Attach Google Places autocomplete when a key is configured.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !g || !inputRef.current) return;
      const ac = new g.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "name", "geometry"],
        types: ["geocode", "establishment"],
      });
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        const label = p.formatted_address ?? p.name ?? "";
        onChange({
          label,
          lat: p.geometry?.location?.lat() ?? null,
          lng: p.geometry?.location?.lng() ?? null,
        });
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        onChange({ label, lat: latitude, lng: longitude });
        setLocating(false);
      },
      () => {
        toast.error("Couldn't get your location. Type your pickup instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[var(--gold-ink)]" />
        <input
          ref={inputRef}
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value, lat: null, lng: null })}
          placeholder="Where do you leave from?"
          autoComplete="off"
          className="h-13 w-full rounded-2xl border bg-card pl-11 pr-4 text-base outline-none focus-visible:border-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/30"
        />
      </div>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-[var(--gold-ink)] disabled:opacity-60"
      >
        {locating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LocateFixed className="size-4" />
        )}
        Use my current location
      </button>
    </div>
  );
}
