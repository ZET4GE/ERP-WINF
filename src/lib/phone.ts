/**
 * Normaliza un teléfono argentino al formato internacional de WhatsApp
 * (+549 + característica + número, sin el "15" de celular).
 * Heurística: no valida de forma estricta longitudes de característica,
 * pero cubre los formatos habituales con los que carga el usuario.
 */
export function normalizePhoneToWhatsApp(raw: string): string {
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.replace(/^(\d{2,4})15/, "$1");

  if (!digits) return "";
  return `+549${digits}`;
}

export function whatsAppLink(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${params}`;
}
