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
import { createTicket, updateTicket, getClientEquipment } from "@/app/(dashboard)/tickets/actions";
import { TICKET_PRIORITIES, type Ticket } from "@/lib/types/ticket";
import { TICKET_PRIORITY_LABEL } from "@/components/tickets/ticket-priority-badge";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  city: string | null;
};

type EquipmentOption = { id: string; serial_number: string; product: { name: string } };

export function TicketForm({
  ticket,
  initialClient,
  trigger,
}: {
  ticket?: Ticket;
  initialClient?: { id: string; first_name: string; last_name: string; business_name: string | null };
  trigger?: ReactElement;
}) {
  const isEdit = !!ticket;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [searching, startSearch] = useTransition();
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    initialClient ? { ...initialClient, city: null } : null
  );

  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(
    ticket?.inventory_item_id ?? null
  );

  const [subject, setSubject] = useState(ticket?.subject ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [priority, setPriority] = useState(ticket?.priority ?? "media");

  useEffect(() => {
    if (!selectedClient) {
      setEquipment([]);
      return;
    }
    getClientEquipment(selectedClient.id).then((items) =>
      setEquipment(items as unknown as EquipmentOption[])
    );
  }, [selectedClient]);

  function handleSearch(value: string) {
    setQuery(value);
    startSearch(async () => {
      const clients = await searchClients(value);
      setResults(clients);
    });
  }

  function handleSubmit() {
    if (!selectedClient) {
      setError("Seleccioná un cliente");
      return;
    }
    setError(null);

    const values = {
      client_id: selectedClient.id,
      inventory_item_id: inventoryItemId,
      subject,
      description: description || undefined,
      priority,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateTicket(ticket!.id, values)
        : await createTicket(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (isEdit) {
        toast.success("Ticket actualizado");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm" />}>
        {!trigger && (
          <>
            <Plus />
            Nuevo ticket
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar ticket" : "Nuevo ticket"}</DialogTitle>
          <DialogDescription>
            Cliente, asunto y prioridad del ticket de soporte.
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
                      className="flex flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-muted/50"
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

          <div className="flex flex-col gap-1.5">
            <Label>Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descripción (opcional)</Label>
            <Textarea rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v as typeof priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Equipo relacionado (opcional)</Label>
              <Select
                value={inventoryItemId ?? "none"}
                onValueChange={(v) => setInventoryItemId(v === "none" ? null : v)}
                disabled={!selectedClient}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product.name} — {item.serial_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button disabled={isPending || !subject} onClick={handleSubmit}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
