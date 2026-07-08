import { z } from "zod";

import { APPOINTMENT_TYPES } from "@/lib/types/appointment";

export const appointmentSchema = z
  .object({
    client_id: z.string().min(1, "Seleccioná un cliente"),
    contract_id: z.string().nullable().optional(),
    type: z.enum(APPOINTMENT_TYPES),
    start_at: z.string().min(1, "Requerido"),
    end_at: z.string().min(1, "Requerido"),
    technician_id: z.string().nullable().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: "La hora de fin debe ser posterior al inicio",
    path: ["end_at"],
  });

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
