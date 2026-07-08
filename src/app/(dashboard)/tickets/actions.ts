"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  ticketSchema,
  ticketUpdateSchema,
  resolveTicketSchema,
  type TicketFormValues,
  type TicketUpdateFormValues,
  type ResolveTicketFormValues,
} from "@/lib/tickets/schema";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/types/ticket";

export async function getClientEquipment(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, serial_number, product:products(id, name)")
    .eq("client_id", clientId)
    .order("serial_number", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as {
    id: string;
    serial_number: string;
    product: { id: string; name: string };
  }[];
}

export async function createTicket(values: TicketFormValues) {
  const parsed = ticketSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const data = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      client_id: data.client_id,
      inventory_item_id: data.inventory_item_id,
      subject: data.subject,
      description: data.description || null,
      priority: data.priority,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !ticket) return { error: "No se pudo crear el ticket" };

  revalidatePath("/tickets");
  revalidatePath(`/clientes/${data.client_id}`);
  redirect(`/tickets/${ticket.id}`);
}

export async function updateTicket(id: string, values: TicketFormValues) {
  const parsed = ticketSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const data = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("tickets")
    .update({
      inventory_item_id: data.inventory_item_id,
      subject: data.subject,
      description: data.description || null,
      priority: data.priority,
      updated_by: user?.id ?? null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el ticket" };

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { error: null };
}

export async function changeTicketStatus(id: string, status: TicketStatus) {
  if (!TICKET_STATUSES.includes(status)) return { error: "Estado inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("tickets")
    .update({ status, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado" };

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { error: null };
}

export async function addTicketUpdate(ticketId: string, values: TicketUpdateFormValues) {
  const parsed = ticketUpdateSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ticket_updates").insert({
    ticket_id: ticketId,
    author_id: user?.id ?? null,
    note: parsed.data.note,
  });

  if (error) return { error: "No se pudo agregar la nota" };

  revalidatePath(`/tickets/${ticketId}`);
  return { error: null };
}

export async function resolveTicket(id: string, values: ResolveTicketFormValues) {
  const parsed = resolveTicketSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("tickets")
    .update({
      status: "resuelto",
      solution_applied: parsed.data.solution_applied,
      time_spent_minutes: parsed.data.time_spent_minutes,
      updated_by: user?.id ?? null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo resolver el ticket" };

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  return { error: null };
}

export async function deleteTicket(id: string) {
  const supabase = await createClient();
  const { data: ticket } = await supabase.from("tickets").select("client_id").eq("id", id).single();

  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar el ticket" };

  revalidatePath("/tickets");
  if (ticket?.client_id) revalidatePath(`/clientes/${ticket.client_id}`);
  redirect("/tickets");
}
