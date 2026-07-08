export const APPOINTMENT_TYPES = [
  "instalacion",
  "soporte",
  "relevamiento",
  "mantenimiento",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  "pendiente",
  "confirmado",
  "completado",
  "cancelado",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Appointment {
  id: string;
  client_id: string;
  contract_id: string | null;
  type: AppointmentType;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  technician_id: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string | null;
  };
  contract: { id: string; title: string } | null;
  technician: { id: string; full_name: string } | null;
}
