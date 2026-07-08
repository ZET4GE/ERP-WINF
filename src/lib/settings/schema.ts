import { z } from "zod";

import { USER_ROLES } from "@/lib/types/profile";

const CURRENCIES = ["ARS", "USD"] as const;

export const companySettingsSchema = z.object({
  name: z.string().min(1, "Requerido"),
  cuit: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  domain: z.string().optional(),
  default_billing_day: z.number().int().min(1).max(28),
  default_currency: z.enum(CURRENCIES),
});

export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

export const inviteUserSchema = z.object({
  full_name: z.string().min(1, "Requerido"),
  email: z.string().email("Email inválido"),
  role: z.enum(USER_ROLES),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
