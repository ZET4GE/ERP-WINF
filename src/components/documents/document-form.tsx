"use client";

import { useState, useTransition } from "react";
import { Building2, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/documents/rich-text-editor";
import { searchClients } from "@/app/(dashboard)/contratos/actions";
import { createDocument, updateDocument } from "@/app/(dashboard)/documentos/actions";
import { documentSchema, type DocumentFormValues } from "@/lib/documents/schema";
import { DOCUMENT_TYPES, type Document as WinfDocument } from "@/lib/types/document";
import { DOCUMENT_TYPE_LABEL } from "@/components/documents/document-status-badge";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  city: string | null;
};

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function DocumentForm({
  document,
  initialClient,
  initialItems,
  defaultCurrency = "ARS",
}: {
  document?: WinfDocument;
  initialClient?: ClientOption;
  initialItems?: { description: string; quantity: number; unit_price: number }[];
  defaultCurrency?: "ARS" | "USD";
}) {
  const isEdit = !!document;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState(document?.doc_type ?? "presupuesto");

  const [manualMode, setManualMode] = useState(!document?.client_id && !initialClient);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [searching, startSearch] = useTransition();
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    initialClient ?? null
  );
  const [manualName, setManualName] = useState(document?.manual_client_name ?? "");
  const [manualContact, setManualContact] = useState(document?.manual_client_contact ?? "");
  const [manualAddress, setManualAddress] = useState(document?.manual_client_address ?? "");

  const [issuedAt, setIssuedAt] = useState(document?.issued_at ?? todayISO());
  const [validUntil, setValidUntil] = useState(document?.valid_until ?? "");
  const [currency, setCurrency] = useState<"ARS" | "USD">(document?.currency ?? defaultCurrency);
  const [items, setItems] = useState(
    document?.items?.length ? document.items : initialItems?.length ? initialItems : []
  );
  const [body, setBody] = useState(document?.body ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");

  function handleSearch(value: string) {
    setQuery(value);
    startSearch(async () => {
      const clients = await searchClients(value);
      setResults(clients);
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function updateItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  function handleSubmit() {
    const candidate: DocumentFormValues = {
      doc_type: docType,
      client_id: manualMode ? null : selectedClient?.id ?? null,
      manual_client_name: manualMode ? manualName : undefined,
      manual_client_contact: manualMode ? manualContact : undefined,
      manual_client_address: manualMode ? manualAddress : undefined,
      issued_at: issuedAt,
      valid_until: validUntil || undefined,
      currency,
      items,
      body: docType === "informe_tecnico" ? body : undefined,
      notes: notes || undefined,
    };

    const parsed = documentSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateDocument(document!.id, parsed.data)
        : await createDocument(parsed.data);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de documento</Label>
              <Select
                value={docType}
                onValueChange={(v) => v && setDocType(v as WinfDocument["doc_type"])}
                disabled={isEdit}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v as "ARS" | "USD")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Fecha de emisión</Label>
              <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Válido hasta (opcional)</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between">
            <Label>Cliente</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setManualMode((v) => !v);
                setSelectedClient(null);
              }}
            >
              {manualMode ? "Buscar cliente existente" : "Cargar datos manuales"}
            </Button>
          </div>

          {manualMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Nombre / razón social</Label>
                <Input value={manualName} onChange={(e) => setManualName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Contacto (tel/email)</Label>
                <Input value={manualContact} onChange={(e) => setManualContact(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Dirección</Label>
                <Input value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar cliente por nombre o razón social..."
                  className="pl-8"
                />
              </div>

              {selectedClient ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                    {selectedClient.business_name && (
                      <p className="text-xs text-muted-foreground">
                        {selectedClient.business_name}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col divide-y rounded-lg border">
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {docType === "informe_tecnico" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Contenido del informe</Label>
              <RichTextEditor value={body} onChange={setBody} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Ítems</Label>
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    placeholder="Descripción"
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, { unit_price: Number(e.target.value) || 0 })
                    }
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3.5" />
                Agregar ítem
              </Button>
              <p className="text-sm font-medium">
                Total: {new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(
                  itemsTotal
                )}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Notas / condiciones (opcional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button disabled={isPending} onClick={handleSubmit}>
          {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear documento"}
        </Button>
      </div>
    </div>
  );
}
