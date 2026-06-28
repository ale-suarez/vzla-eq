"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, type MapRef } from "@vis.gl/react-maplibre";
import { LocateFixed, MapPin, Minus, Plus, Search } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { CARACAS_CENTER } from "@/lib/incidents";

// Free, no-key OpenFreeMap vector style (same as the dashboard map).
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

type Suggestion = { label: string; lat: number; lng: number };

export type PickedLocation = {
  latitude: number;
  longitude: number;
  /** Geocoded human-readable label for the pinned point. */
  address: string;
};

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { latitude: number | null; longitude: number | null; address: string };
  onChange: (location: PickedLocation) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  // Single field: while focused it is a search query; when blurred it shows the
  // resolved address. `query` only holds the in-progress search text.
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  // A programmatic flyTo (suggestion pick / geolocate) also fires onMoveEnd; we
  // already have the right label in those cases, so skip the reverse-geocode.
  const skipNextMoveEndRef = useRef(false);

  const hasPin = value.latitude !== null && value.longitude !== null;
  const center = {
    longitude: value.longitude ?? CARACAS_CENTER.lng,
    latitude: value.latitude ?? CARACAS_CENTER.lat,
  };

  // The input shows the live query while focused, otherwise the settled address.
  // Always coalesce to a string so the input stays controlled even when a caller
  // passes an undefined address.
  const fieldValue = focused ? query : value.address ?? "";

  // Reverse-geocode a pinned point into a human-readable label.
  const resolveAddress = useCallback(
    async (lat: number, lng: number) => {
      setResolving(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
        const body = (await res.json()) as { data?: { label: string | null } };
        onChange({ latitude: lat, longitude: lng, address: body.data?.label ?? "" });
      } catch {
        onChange({ latitude: lat, longitude: lng, address: "" });
      } finally {
        setResolving(false);
      }
    },
    [onChange]
  );

  // Debounced forward search as the citizen types. The clear/fetch both run
  // inside the timer (asynchronously), never synchronously in the effect body.
  useEffect(() => {
    if (!focused) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { data?: Suggestion[] };
        setSuggestions(body.data ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, focused]);

  const settleOn = (s: Suggestion) => {
    setSuggestions([]);
    setQuery("");
    setFocused(false);
    skipNextMoveEndRef.current = true;
    mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 16, duration: 800 });
    // The suggestion already carries a label; keep it instead of re-resolving.
    onChange({ latitude: s.lat, longitude: s.lng, address: s.label });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        skipNextMoveEndRef.current = true;
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 800 });
        void resolveAddress(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // After the map settles, read the locked center pin and reverse-geocode it —
  // unless the move was programmatic, or the user is mid-search.
  const handleMoveEnd = () => {
    if (skipNextMoveEndRef.current) {
      skipNextMoveEndRef.current = false;
      return;
    }
    if (focused) return;
    const c = mapRef.current?.getMap().getCenter();
    if (!c) return;
    void resolveAddress(c.lat, c.lng);
  };

  return (
    <div className="space-y-3">
      {/* Single field: search while focused, resolved address when blurred. */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-[12px] border border-outline-variant bg-surface-container-lowest px-3 focus-within:border-primary">
          <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <input
            type="text"
            value={resolving && !focused ? "Resolviendo dirección…" : fieldValue}
            onFocus={() => {
              setFocused(true);
              setQuery("");
            }}
            onBlur={() => {
              // Delay so a suggestion click registers before we hide the list.
              setTimeout(() => {
                setFocused(false);
                setSuggestions([]);
              }, 150);
            }}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca calle, sector o ciudad"
            className="h-11 w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
          />
        </div>
        {focused && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[12px] border border-outline-variant bg-surface-container-lowest shadow-lg">
            {suggestions.map((s, i) => (
              <li key={`${s.lat},${s.lng},${i}`}>
                <button
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the pick lands.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    settleOn(s);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-surface-container-low"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-snug">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map with a fixed center pin: the citizen drags the map under the pin. */}
      <div className="relative h-[300px] w-full overflow-hidden rounded-[12px] border border-outline-variant">
        <Map
          ref={mapRef}
          mapStyle={MAP_STYLE}
          initialViewState={{ longitude: center.longitude, latitude: center.latitude, zoom: hasPin ? 16 : 12 }}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
          onMoveEnd={handleMoveEnd}
          onError={(e) => {
            const err = e.error as (Error & { status?: number }) | undefined;
            const aborted =
              err?.name === "AbortError" ||
              err?.status === 0 ||
              /Failed to fetch|aborted/i.test(err?.message ?? "");
            if (!aborted) console.error("[location-picker]", err);
          }}
        />

        {/* Fixed center pin overlay (pointer-events-none so drags pan the map). */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="-translate-y-3">
            <MapPin className="h-9 w-9 fill-primary text-white drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-md transition-colors hover:bg-surface-container-high"
            aria-label="Acercar"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-md transition-colors hover:bg-surface-container-high"
            aria-label="Alejar"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* "Usar mi ubicación" */}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-primary-container bg-primary-fixed px-3 py-2.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <LocateFixed className="h-4 w-4" />
        {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
      </button>
    </div>
  );
}
