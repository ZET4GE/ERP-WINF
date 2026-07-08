"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LocationPickerMap = dynamic(
  () => import("./location-picker-map").then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function ClientMiniMap({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  return (
    <LocationPickerMap
      position={lat != null && lng != null ? { lat, lng } : null}
      readOnly
    />
  );
}
