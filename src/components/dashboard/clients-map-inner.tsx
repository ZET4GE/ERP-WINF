"use client";

import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { ClientStatus } from "@/lib/types/client";

export interface MapClient {
  id: string;
  name: string;
  status: ClientStatus;
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: [number, number] = [-30.7051, -62.0011]; // Morteros, Córdoba

// Colores alineados a ClientStatusBadge (activo/moroso/potencial/inactivo).
const STATUS_COLOR: Record<ClientStatus, string> = {
  activo: "#13B5A6",
  moroso: "#E34948",
  potencial: "#F59E0B",
  inactivo: "#94A3B8",
};

function statusIcon(status: ClientStatus) {
  const color = STATUS_COLOR[status];
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

export function ClientsMapInner({ clients }: { clients: MapClient[] }) {
  const center =
    clients.length > 0 ? ([clients[0].lat, clients[0].lng] as [number, number]) : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={clients.length > 0 ? 11 : 12}
      scrollWheelZoom={false}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clients.map((client) => (
        <Marker key={client.id} position={[client.lat, client.lng]} icon={statusIcon(client.status)}>
          <Popup>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{client.name}</span>
              <Link href={`/clientes/${client.id}`} className="text-xs text-primary underline">
                Ver ficha
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
