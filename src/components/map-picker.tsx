"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export type MapValue = { lat: number; lng: number; label: string };
type LatLng = { lat: number; lng: number };

const PIN = L.divIcon({
  className: "",
  html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.9 0 1 4.9 1 11c0 7.7 9.4 19.4 10.1 20.3.5.6 1.4.6 1.9 0C13.6 30.4 23 18.7 23 11 23 4.9 18.1 0 12 0z" fill="#4f46e5"/>
    <circle cx="12" cy="11" r="4" fill="#fff"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

function shortLabel(displayName?: string): string {
  if (!displayName) return "";
  return displayName.split(",").slice(0, 3).join(",").trim();
}

async function reverseGeocode(ll: LatLng): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat=${ll.lat}&lon=${ll.lng}`,
    );
    const j = await r.json();
    return shortLabel(j.display_name) || `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`;
  } catch {
    return `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`;
  }
}

function ClickHandler({ onPick }: { onPick: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

type NominatimResult = { lat: string; lon: string; display_name: string };

export default function MapPicker({
  defaultCenter,
  initial,
  onChange,
}: {
  defaultCenter: LatLng;
  initial: MapValue | null;
  onChange: (v: MapValue) => void;
}) {
  const [marker, setMarker] = useState<LatLng>(initial ?? defaultCenter);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  async function pick(ll: LatLng) {
    setMarker(ll);
    const label = await reverseGeocode(ll);
    onChange({ ...ll, label });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error("Couldn't get your location. Allow location access or tap the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Debounced Nominatim search.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
        );
        setResults(await r.json());
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function chooseResult(r: NominatimResult) {
    const ll = { lat: Number(r.lat), lng: Number(r.lon) };
    setMarker(ll);
    setQuery(shortLabel(r.display_name));
    setOpen(false);
    setResults([]);
    onChange({ ...ll, label: shortLabel(r.display_name) });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search area or landmark"
          className="pl-9"
          aria-label="Search for a pickup location"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => chooseResult(r)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {shortLabel(r.display_name)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
      >
        {locating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LocateFixed className="size-4" />
        )}
        Use my current location
      </button>

      <div className="relative z-0 isolate overflow-hidden rounded-xl border">
        <MapContainer
          center={[marker.lat, marker.lng]}
          zoom={13}
          style={{ height: 240, width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          <Recenter center={marker} />
          <Marker
            position={[marker.lat, marker.lng]}
            icon={PIN}
            draggable
            eventHandlers={{
              dragend(e) {
                const p = (e.target as L.Marker).getLatLng();
                pick({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap the map or drag the pin to set your exact pickup point.
      </p>
    </div>
  );
}
