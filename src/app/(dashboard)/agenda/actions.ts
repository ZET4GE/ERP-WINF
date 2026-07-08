"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { appointmentSchema, type AppointmentFormValues } from "@/lib/appointments/schema";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/types/appointment";

export async function searchContractsByClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("id, title")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return data;
}

export async function createAppointment(values: AppointmentFormValues) {
  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { client_id, contract_id, type, start_at, end_at, technician_id, address, notes } =
    parsed.data;

  const { error } = await supabase.from("appointments").insert({
    client_id,
    contract_id: contract_id || null,
    type,
    start_at,
    end_at,
    technician_id: technician_id || null,
    address: address || null,
    notes: notes || null,
  });

  if (error) return { error: "No se pudo crear el turno" };

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${client_id}`);
  revalidatePath("/");
  return { error: null };
}

export async function updateAppointment(id: string, values: AppointmentFormValues) {
  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { client_id, contract_id, type, start_at, end_at, technician_id, address, notes } =
    parsed.data;

  const { error } = await supabase
    .from("appointments")
    .update({
      client_id,
      contract_id: contract_id || null,
      type,
      start_at,
      end_at,
      technician_id: technician_id || null,
      address: address || null,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el turno" };

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${client_id}`);
  revalidatePath("/");
  return { error: null };
}

export async function rescheduleAppointment(id: string, startAt: string, endAt: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", id)
    .select("client_id")
    .single();

  if (error || !data) return { error: "No se pudo reprogramar el turno" };

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${data.client_id}`);
  return { error: null };
}

export async function changeAppointmentStatus(id: string, status: AppointmentStatus) {
  if (!APPOINTMENT_STATUSES.includes(status)) return { error: "Estado inválido" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("client_id")
    .single();

  if (error || !data) return { error: "No se pudo cambiar el estado del turno" };

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${data.client_id}`);
  revalidatePath("/");
  return { error: null };
}
