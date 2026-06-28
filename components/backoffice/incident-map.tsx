"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre";
import { Minus, Plus, LocateFixed } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { CARACAS_CENTER, VERDICT_MARKER, type Incident } from "@/lib/incidents";
import { VERDICT_LABELS, type VerdictLevel } from "@/lib/assessment";
import { cn } from "@/lib/utils";
import { getCurrentGeoPoint } from "@/lib/geolocation";

// Free, no-key OpenFreeMap vector style.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

const LEGEND: VerdictLevel[] = ["critical", "severe", "moderate", "low"];

// Geographic bounds reported to the parent so the list can mirror the viewport.
export type MapBounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export default function IncidentMap({
  incidents,
  selectedId,
  onSelect,
  onBoundsChange,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const hasFitInitialBounds = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locating, startLocating] = useTransition();

  // When the selection changes (e.g. from a list-card click), fly to it.
  useEffect(() => {
    if (!selectedId) return;
    const target = incidents.find((i) => i.id === selectedId);
    if (!target) return;
    mapRef.current?.flyTo({ center: [target.lng, target.lat], zoom: 14, duration: 800 });
  }, [selectedId, incidents]);

  useEffect(() => {
    if (!mapLoaded || hasFitInitialBounds.current || selectedId || incidents.length === 0) {
      return;
    }

    const coords = incidents
      .filter((incident) => Number.isFinite(incident.lat) && Number.isFinite(incident.lng))
      .map((incident) => [incident.lng, incident.lat] as const);

    if (coords.length === 0) {
      hasFitInitialBounds.current = true;
      return;
    }

    if (coords.length === 1) {
      const [lng, lat] = coords[0];
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
      hasFitInitialBounds.current = true;
      return;
    }

    const bounds = coords.reduce(
      (acc, [lng, lat]) => {
        acc.minLng = Math.min(acc.minLng, lng);
        acc.maxLng = Math.max(acc.maxLng, lng);
        acc.minLat = Math.min(acc.minLat, lat);
        acc.maxLat = Math.max(acc.maxLat, lat);
        return acc;
      },
      {
        minLng: Infinity,
        maxLng: -Infinity,
        minLat: Infinity,
        maxLat: -Infinity,
      }
    );

    mapRef.current?.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      { padding: 80, duration: 800 }
    );
    hasFitInitialBounds.current = true;
  }, [incidents, mapLoaded, selectedId]);

  // Report the current viewport bounds so the parent list can mirror it.
  const emitBounds = () => {
    const map = mapRef.current;
    if (!map || !onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      minLng: b.getWest(),
      minLat: b.getSouth(),
      maxLng: b.getEast(),
      maxLat: b.getNorth(),
    });
  };

  const handleLocateMe = () => {
    startLocating(async () => {
      try {
        const { latitude, longitude } = await getCurrentGeoPoint();
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15, duration: 800 });
      } catch (error) {
        console.error("[map] geolocation", error);
      }
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: CARACAS_CENTER.lng, latitude: CARACAS_CENTER.lat, zoom: 12 }}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={() => {
          setMapLoaded(true);
          emitBounds();
        }}
        onMoveEnd={emitBounds}
        onError={(e) => {
          // MapLibre aborts in-flight tile fetches while panning/zooming (and on
          // StrictMode remounts in dev), surfacing as "Failed to fetch" / status 0.
          // These are benign — only log genuine tile/style errors.
          const err = e.error as (Error & { status?: number }) | undefined;
          const aborted =
            err?.name === "AbortError" ||
            err?.status === 0 ||
            /Failed to fetch|aborted/i.test(err?.message ?? "");
          if (!aborted) console.error("[map]", err);
        }}
      >
        {incidents.map((incident) => {
          const conf = VERDICT_MARKER[incident.verdict];
          const selected = incident.id === selectedId;
          return (
            <Marker
              key={incident.id}
              longitude={incident.lng}
              latitude={incident.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(incident.id);
              }}
            >
              <div className="group relative cursor-pointer">
                <div
                  className={cn(
                    "relative rounded-full border-2 border-white/80 opacity-75 shadow-lg transition-all",
                    conf.circle,
                    selected ? "h-7 w-7 opacity-100 ring-2 ring-offset-2 ring-on-surface" : "h-5 w-5"
                  )}
                />
                {/* Hover tooltip */}
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-on-surface px-3 py-2 text-[10px] font-bold text-surface opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  {incident.title}
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Custom zoom / locate controls */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-[0px_4px_20px_rgba(0,0,0,0.08)] transition-colors hover:bg-surface-container-high"
          aria-label="Acercar"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-[0px_4px_20px_rgba(0,0,0,0.08)] transition-colors hover:bg-surface-container-high"
          aria-label="Alejar"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 text-on-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.08)] transition-colors hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-60"
          aria-label="Localízame"
          title="Localízame"
        >
          <LocateFixed className="h-5 w-5 text-on-surface-variant" />
          <span className="text-xs font-semibold uppercase tracking-[0.08em]">Localízame</span>
        </button>
      </div>

      {/* Legend — pinned within the map bounds so it wraps instead of overflowing
          on narrow viewports. The zoom controls sit at right-6, so cap the width. */}
      <div className="absolute bottom-6 left-6 right-20 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] sm:right-auto sm:max-w-[calc(100%-6rem)]">
        {LEGEND.map((verdict) => (
          <div key={verdict} className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", VERDICT_MARKER[verdict].dot)} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
              {VERDICT_LABELS[verdict]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
