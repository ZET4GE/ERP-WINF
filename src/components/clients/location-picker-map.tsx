"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Los ícono por defecto de Leaflet referencian assets que Webpack no resuelve
// automáticamente; se apuntan a los del CDN de unpkg.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [-30.7051, -62.0011]; // Morteros, Córdoba

function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPickerMap({
  position,
  onChange,
  readOnly = false,
}: {
  position: { lat: number; lng: number } | null;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  const center: [number, number] = position
    ? [position.lat, position.lng]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={position ? 16 : 13}
      scrollWheelZoom={false}
      dragging={!readOnly}
      className="h-64 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange center={center} />
      {!readOnly && onChange && <ClickHandler onPick={onChange} />}
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={markerIcon}
          draggable={!readOnly}
          eventHandlers={
            !readOnly && onChange
              ? {
                  dragend: (e) => {
                    const marker = e.target as L.Marker;
                    const { lat, lng } = marker.getLatLng();
                    onChange(lat, lng);
                  },
                }
              : undefined
          }
        />
      )}
    </MapContainer>
  );
}
