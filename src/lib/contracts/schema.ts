import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/types/contract";

const CURRENCIES = ["ARS", "USD"] as const;

export const equipoFinanciadoSchema = z.object({
  item_type: z.literal("equipo_financiado"),
  service_id: z.string().nullable(),
  description: z.string().min(1, "Requerido"),
  currency: z.enum(CURRENCIES),
  total_amount: z.number().positive("Debe ser mayor a 0"),
  down_payment: z.number().nonnegative("No puede ser negativa"),
  installments_count: z.number().int().min(1).max(6),
  inventory_item_id: z.string().nullable().optional(),
});

export const cargoUnicoSchema = z.object({
  item_type: z.literal("cargo_unico"),
  service_id: z.string().nullable(),
  description: z.string().min(1, "Requerido"),
  currency: z.enum(CURRENCIES),
  single_amount: z.number().positive("Debe ser mayor a 0"),
});

export const subscriptionLineSchema = z.object({
  label: z.string().min(1, "Requerido"),
  amount: z.number().nonnegative("No puede ser negativo"),
});

export const suscripcionSchema = z.object({
  item_type: z.literal("suscripcion"),
  service_id: z.string().nullable(),
  description: z.string().min(1, "Requerido"),
  currency: z.enum(CURRENCIES),
  subscription_breakdown: z.array(subscriptionLineSchema).min(1, "Agregá al menos un concepto"),
  billing_day: z.number().int().min(1).max(28),
  subscription_start_date: z.string().min(1, "Requerido"),
});

export const contractItemSchema = z.discriminatedUnion("item_type", [
  equipoFinanciadoSchema,
  cargoUnicoSchema,
  suscripcionSchema,
]);

export const installationAppointmentSchema = z.object({
  start_at: z.string().min(1, "Requerido"),
  end_at: z.string().min(1, "Requerido"),
});

export const contractSchema = z.object({
  client_id: z.string().min(1, "Requerido"),
  title: z.string().min(1, "Requerido"),
  start_date: z.string().min(1, "Requerido"),
  notes: z.string().optional(),
  items: z.array(contractItemSchema).min(1, "Agregá al menos un ítem"),
  schedule_installation: installationAppointmentSchema.nullable().optional(),
});

export const paymentSchema = z.object({
  paid_at: z.string().min(1, "Requerido"),
  payment_method: z.enum(PAYMENT_METHODS),
});

export type ContractFormValues = z.infer<typeof contractSchema>;
export type ContractItemFormValues = z.infer<typeof contractItemSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
