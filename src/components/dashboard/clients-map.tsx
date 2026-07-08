"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { MapClient } from "./clients-map-inner";

const ClientsMapInner = dynamic(
  () => import("./clients-map-inner").then((m) => m.ClientsMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function ClientsMap({ clients }: { clients: MapClient[] }) {
  return <ClientsMapInner clients={clients} />;
}

export type { MapClient };
