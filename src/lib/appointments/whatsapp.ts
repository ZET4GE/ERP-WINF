import { format } from "date-fns";
import { es } from "date-fns/locale";

import type { AppointmentType } from "@/lib/types/appointment";

const TYPE_LABEL: Record<AppointmentType, string> = {
  instalacion: "instalación",
  soporte: "soporte",
  relevamiento: "relevamiento",
  mantenimiento: "mantenimiento",
};

export function buildConfirmationMessage({
  clientFirstName,
  type,
  startAt,
}: {
  clientFirstName: string;
  type: AppointmentType;
  startAt: string | Date;
}) {
  const date = typeof startAt === "string" ? new Date(startAt) : startAt;
  const fecha = format(date, "dd/MM/yyyy", { locale: es });
  const hora = format(date, "HH:mm", { locale: es });

  return `Hola ${clientFirstName}, te confirmo la visita de ${TYPE_LABEL[type]} para el ${fecha} a las ${hora} — WINF`;
}

export function buildAppointmentReminderMessage({
  clientFirstName,
  type,
  startAt,
}: {
  clientFirstName: string;
  type: AppointmentType;
  startAt: string | Date;
}) {
  const date = typeof startAt === "string" ? new Date(startAt) : startAt;
  const hora = format(date, "HH:mm", { locale: es });

  return `Hola ${clientFirstName}! Te recordamos tu turno de ${TYPE_LABEL[type]} mañana a las ${hora} — WINF`;
}
