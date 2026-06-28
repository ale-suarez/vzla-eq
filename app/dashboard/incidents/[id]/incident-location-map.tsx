"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { CARACAS_CENTER } from "@/lib/incidents";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function IncidentLocationMap({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (latitude === null || longitude === null) {
      return;
    }

    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 700,
    });
  }, [latitude, longitude]);

  const hasPoint = latitude !== null && longitude !== null;

  return (
    <div className="h-56 w-full overflow-hidden rounded-[18px] border border-outline-variant bg-surface">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{
          longitude: hasPoint ? longitude : CARACAS_CENTER.lng,
          latitude: hasPoint ? latitude : CARACAS_CENTER.lat,
          zoom: hasPoint ? 15 : 12,
        }}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {hasPoint && (
          <Marker longitude={longitude} latitude={latitude} anchor="center">
            <div className="h-5 w-5 rounded-full border-4 border-white bg-primary shadow-lg ring-2 ring-primary/20" />
          </Marker>
        )}
      </Map>
    </div>
  );
}
