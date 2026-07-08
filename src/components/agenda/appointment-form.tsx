"use client";

import { useEffect, useState, useTransition, type ReactElement } from "react";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchClients } from "@/app/(dashboard)/contratos/actions";
import {
  createAppointment,
  searchContractsByClient,
  updateAppointment,
} from "@/app/(dashboard)/agenda/actions";
import { findOverlaps } from "@/lib/appointments/overlap";
import {
  APPOINTMENT_TYPES,
  type AppointmentStatus,
  type AppointmentType,
  type AppointmentWithRelations,
} from "@/lib/types/appointment";
import { TYPE_LABEL } from "@/components/agenda/appointment-type-badge";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  city: string | null;
};

type ContractOption = { id: string; title: string };

type OverlapCandidate = {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  label: string;
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function defaultRange(base?: Date) {
  const start = base ? new Date(base) : new Date();
  if (!base) {
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
  }
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start: toLocalInputValue(start), end: toLocalInputValue(end) };
}

export function AppointmentForm({
  appointment,
  initialClient,
  technicians,
  existingAppointments,
  defaultStartAt,
  trigger,
}: {
  appointment?: AppointmentWithRelations;
  initialClient?: {
    id: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string | null;
    address: string | null;
  };
  technicians: { id: string; full_name: string }[];
  existingAppointments: OverlapCandidate[];
  defaultStartAt?: Date;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [searching, startSearch] = useTransition();
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    appointment
      ? {
          id: appointment.client.id,
          first_name: appointment.client.first_name,
          last_name: appointment.client.last_name,
          business_name: appointment.client.business_name,
          city: null,
        }
      : initialClient
        ? { ...initialClient, city: null }
        : null
  );

  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [contractId, setContractId] = useState<string>(appointment?.contract_id ?? "none");
  const [type, setType] = useState(appointment?.type ?? "instalacion");
  const range = defaultRange(defaultStartAt);
  const [startAt, setStartAt] = useState(
    appointment ? toLocalInputValue(new Date(appointment.start_at)) : range.start
  );
  const [endAt, setEndAt] = useState(
    appointment ? toLocalInputValue(new Date(appointment.end_at)) : range.end
  );
  const [technicianId, setTechnicianId] = useState(appointment?.technician_id ?? "none");
  const [address, setAddress] = useState(
    appointment?.address ?? initialClient?.address ?? ""
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");

  useEffect(() => {
    if (!selectedClient) {
      setContracts([]);
      return;
    }
    searchContractsByClient(selectedClient.id).then(setContracts);
    if (!appointment && !address && initialClient?.id === selectedClient.id) {
      setAddress(initialClient.address ?? "");
    }
  }, [selectedClient, appointment, address, initialClient]);

  function handleSearch(value: string) {
    setQuery(value);
    startSearch(async () => {
      const clients = await searchClients(value);
      setResults(clients);
    });
  }

  const overlaps = findOverlaps(
    { id: appointment?.id, start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString() },
    existingAppointments
  );

  function handleSubmit() {
    if (!selectedClient) return;
    startTransition(async () => {
      const values = {
        client_id: selectedClient.id,
        contract_id: contractId === "none" ? null : contractId,
        type,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        technician_id: technicianId === "none" ? null : technicianId,
        address,
        notes,
      };

      const result = appointment
        ? await updateAppointment(appointment.id, values)
        : await createAppointment(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(appointment ? "Turno actualizado" : "Turno creado");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm" />}>
        {!trigger && (
          <>
            <Plus />
            Nuevo turno
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar turno" : "Nuevo turno"}</DialogTitle>
          <DialogDescription>
            Cliente, tipo de visita y horario del turno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cliente</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </p>
                  {selectedClient.business_name && (
                    <p className="text-xs text-muted-foreground">{selectedClient.business_name}</p>
                  )}
                </div>
                {!initialClient && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                    Cambiar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="pl-8"
                  />
                </div>
                <div className="flex max-h-40 flex-col divide-y overflow-y-auto rounded-lg border">
                  {searching && (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Buscando...
                    </div>
                  )}
                  {!searching && results.length === 0 && (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Building2 className="size-4" /> Escribí para buscar un cliente
                    </div>
                  )}
                  {results.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClient(client)}
                      className="flex flex-col items-start gap-0.5 p-2.5 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">
                        {client.first_name} {client.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[client.business_name, client.city].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Contrato (opcional)</Label>
              <Select
                value={contractId}
                onValueChange={(v) => setContractId(v ?? "none")}
                disabled={!selectedClient}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin contrato</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Inicio</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {overlaps.length > 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
              Se superpone con: {overlaps.map((o) => o.label).join(", ")}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Técnico (opcional)</Label>
            <Select value={technicianId} onValueChange={(v) => setTechnicianId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedClient || isPending}>
            {isPending ? "Guardando..." : appointment ? "Guardar cambios" : "Crear turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
