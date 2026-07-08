"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

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

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&limit=5&q=${encodeURIComponent(
            query
          )}`
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectResult(result: NominatimResult) {
    onChange(parseFloat(result.lat), parseFloat(result.lon));
    setQuery(result.display_name);
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar dirección para ubicar en el mapa..."
          className="pl-8"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectResult(result)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <LocationPickerMap
        position={lat != null && lng != null ? { lat, lng } : null}
        onChange={(newLat, newLng) => onChange(newLat, newLng)}
      />

      <p className="text-xs text-muted-foreground">
        {lat != null && lng != null
          ? `Ubicación seleccionada: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Arrastrá el pin o hacé click en el mapa para ajustar.`
          : "Buscá una dirección o hacé click en el mapa para ubicar al cliente."}
      </p>
    </div>
  );
}
