import { z } from "zod";

const CURRENCIES = ["ARS", "USD"] as const;

export const manualExpenseSchema = z.object({
  category_id: z.string().min(1, "Requerido"),
  amount: z.number().positive("Debe ser mayor a 0"),
  currency: z.enum(CURRENCIES),
  date: z.string().min(1, "Requerido"),
  description: z.string().optional(),
});

export const recurringExpenseSchema = z.object({
  name: z.string().min(1, "Requerido"),
  category_id: z.string().nullable().optional(),
  amount: z.number().positive("Debe ser mayor a 0"),
  currency: z.enum(CURRENCIES),
  day_of_month: z.number().int().min(1).max(28),
  active: z.boolean(),
});

export type ManualExpenseFormValues = z.infer<typeof manualExpenseSchema>;
export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseSchema>;
