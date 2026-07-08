"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/server";
import { documentSchema, type DocumentFormValues } from "@/lib/documents/schema";
import { DOCUMENT_STATUSES, type DocumentStatus, type DocumentItem } from "@/lib/types/document";
import { formatCurrency } from "@/lib/format";
import { DocumentPdfTemplate } from "@/lib/documents/pdf-template";

function computeTotals(items: DocumentItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return { subtotal, total: subtotal };
}

export async function createDocument(values: DocumentFormValues) {
  const parsed = documentSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const data = parsed.data;
  const { subtotal, total } = computeTotals(data.items);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      doc_type: data.doc_type,
      client_id: data.client_id,
      contract_id: data.contract_id || null,
      manual_client_name: data.client_id ? null : data.manual_client_name || null,
      manual_client_contact: data.client_id ? null : data.manual_client_contact || null,
      manual_client_address: data.client_id ? null : data.manual_client_address || null,
      issued_at: data.issued_at,
      valid_until: data.valid_until || null,
      currency: data.currency,
      items: data.doc_type === "informe_tecnico" ? [] : data.items,
      body: data.doc_type === "informe_tecnico" ? data.body || null : null,
      notes: data.notes || null,
      subtotal,
      total,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !document) return { error: "No se pudo crear el documento" };

  revalidatePath("/documentos");
  redirect(`/documentos/${document.id}`);
}

export async function updateDocument(id: string, values: DocumentFormValues) {
  const parsed = documentSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("documents")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return { error: "Documento no encontrado" };
  if (existing.status !== "borrador") {
    return { error: "Solo se pueden editar documentos en borrador" };
  }

  const data = parsed.data;
  const { subtotal, total } = computeTotals(data.items);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("documents")
    .update({
      client_id: data.client_id,
      manual_client_name: data.client_id ? null : data.manual_client_name || null,
      manual_client_contact: data.client_id ? null : data.manual_client_contact || null,
      manual_client_address: data.client_id ? null : data.manual_client_address || null,
      issued_at: data.issued_at,
      valid_until: data.valid_until || null,
      currency: data.currency,
      items: data.doc_type === "informe_tecnico" ? [] : data.items,
      body: data.doc_type === "informe_tecnico" ? data.body || null : null,
      notes: data.notes || null,
      subtotal,
      total,
      updated_by: user?.id ?? null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el documento" };

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  return { error: null };
}

export async function changeDocumentStatus(id: string, status: DocumentStatus) {
  if (!DOCUMENT_STATUSES.includes(status)) return { error: "Estado inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("documents")
    .update({ status, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado" };

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  return { error: null };
}

async function loadDocumentForPdf(documentId: string) {
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select(
      `*, client:clients(id, first_name, last_name, business_name, phone, address, city)`
    )
    .eq("id", documentId)
    .single();

  if (error || !doc) return null;

  const clientName = doc.client
    ? `${doc.client.first_name} ${doc.client.last_name}${
        doc.client.business_name ? ` (${doc.client.business_name})` : ""
      }`
    : doc.manual_client_name ?? "Cliente sin datos";

  const clientContact = doc.client?.phone ?? doc.manual_client_contact ?? null;
  const clientAddress = doc.client
    ? [doc.client.address, doc.client.city].filter(Boolean).join(", ") || null
    : doc.manual_client_address ?? null;

  return { doc, clientName, clientContact, clientAddress };
}

export async function renderDocumentPdf(documentId: string) {
  const loaded = await loadDocumentForPdf(documentId);
  if (!loaded) return { error: "Documento no encontrado" };

  const { doc, clientName, clientContact, clientAddress } = loaded;

  const buffer = await renderToBuffer(
    <DocumentPdfTemplate
      docType={doc.doc_type}
      number={doc.number}
      issuedAt={doc.issued_at}
      validUntil={doc.valid_until}
      currency={doc.currency}
      clientName={clientName}
      clientContact={clientContact}
      clientAddress={clientAddress}
      items={doc.items ?? []}
      body={doc.body}
      notes={doc.notes}
      subtotal={doc.subtotal}
      total={doc.total}
    />
  );

  return {
    error: null,
    base64: buffer.toString("base64"),
    filename: `${doc.number}.pdf`,
  };
}

export async function saveDocumentPdfToStorage(documentId: string) {
  const loaded = await loadDocumentForPdf(documentId);
  if (!loaded) return { error: "Documento no encontrado" };

  const { doc, clientName, clientContact, clientAddress } = loaded;

  const buffer = await renderToBuffer(
    <DocumentPdfTemplate
      docType={doc.doc_type}
      number={doc.number}
      issuedAt={doc.issued_at}
      validUntil={doc.valid_until}
      currency={doc.currency}
      clientName={clientName}
      clientContact={clientContact}
      clientAddress={clientAddress}
      items={doc.items ?? []}
      body={doc.body}
      notes={doc.notes}
      subtotal={doc.subtotal}
      total={doc.total}
    />
  );

  const supabase = await createClient();
  const path = `${doc.doc_type}/${doc.number}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) return { error: "No se pudo guardar el PDF en Storage" };

  const { error: updateError } = await supabase
    .from("documents")
    .update({ pdf_url: path })
    .eq("id", documentId);

  if (updateError) return { error: "El PDF se guardó pero no se pudo actualizar el documento" };

  revalidatePath(`/documentos/${documentId}`);
  return { error: null };
}

export async function generateComprobanteFromContract(contractId: string) {
  const supabase = await createClient();

  const { data: contract, error } = await supabase
    .from("contracts")
    .select(
      `id, client_id, title,
       items:contract_items(
         id, item_type, description, currency, total_amount, down_payment,
         installments_count, single_amount, monthly_amount,
         installments(number, amount, status),
         subscription_charges(amount, status)
       )`
    )
    .eq("id", contractId)
    .single();

  if (error || !contract) return { error: "Contrato no encontrado" };

  const items: DocumentItem[] = [];
  let currency: "ARS" | "USD" = "ARS";

  for (const item of contract.items) {
    currency = item.currency;

    if (item.item_type === "equipo_financiado") {
      const total = item.installments_count ?? 0;
      const paid = item.installments.filter((i) => i.status === "pagada").length;
      const remaining = total - paid;
      const perInstallment = item.installments[0]?.amount ?? 0;
      const nextNumber = Math.min(paid + 1, total);
      const progress =
        remaining > 0
          ? `Cuota ${nextNumber}/${total} — Restan ${remaining} cuotas de ${formatCurrency(perInstallment, item.currency)}`
          : "Equipo financiado — cuotas completadas";
      items.push({
        description: `${item.description} — ${progress}`,
        quantity: 1,
        unit_price: perInstallment,
      });
    } else if (item.item_type === "cargo_unico") {
      items.push({
        description: item.description,
        quantity: 1,
        unit_price: item.single_amount ?? 0,
      });
    } else {
      items.push({
        description: `Servicio mensual WINF: ${item.description}`,
        quantity: 1,
        unit_price: item.monthly_amount ?? 0,
      });
    }
  }

  const { subtotal, total } = computeTotals(items);

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      doc_type: "comprobante",
      client_id: contract.client_id,
      contract_id: contract.id,
      issued_at: new Date().toISOString().slice(0, 10),
      currency,
      items,
      notes: `Comprobante generado a partir del contrato "${contract.title}".`,
      subtotal,
      total,
    })
    .select("id")
    .single();

  if (insertError || !document) return { error: "No se pudo generar el comprobante" };

  revalidatePath("/documentos");
  redirect(`/documentos/${document.id}`);
}

export async function convertDocumentToContract(documentId: string) {
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, doc_type, client_id")
    .eq("id", documentId)
    .single();

  if (error || !doc) return { error: "Documento no encontrado" };
  if (doc.doc_type !== "presupuesto") return { error: "Solo se pueden convertir presupuestos" };

  const params = new URLSearchParams();
  params.set("from_document", documentId);
  if (doc.client_id) params.set("client_id", doc.client_id);

  redirect(`/contratos/nuevo?${params.toString()}`);
}
