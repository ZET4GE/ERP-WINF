"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import {
  manualExpenseSchema,
  recurringExpenseSchema,
  type RecurringExpenseFormValues,
} from "@/lib/finance/schema";
import { loadMonthlyReportData } from "@/lib/finance/monthly-report";
import { buildMonthlyReportWorkbook } from "@/lib/finance/report-excel";
import { MonthlyReportPdfTemplate } from "@/lib/finance/report-pdf-template";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const label = format(new Date(year, monthNum - 1, 1), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function createManualExpense(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = manualExpenseSchema.safeParse({
    category_id: typeof raw.category_id === "string" ? raw.category_id : "",
    amount: Number(raw.amount),
    currency: raw.currency,
    date: typeof raw.date === "string" ? raw.date : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { category_id, amount, currency, date, description } = parsed.data;
  const supabase = await createClient();

  const file = formData.get("file");
  let attachmentUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const path = `manual/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) return { error: "No se pudo subir el adjunto" };
    attachmentUrl = path;
  }

  const { error } = await supabase.from("transactions").insert({
    type: "egreso",
    origin: "gasto_manual",
    category_id,
    amount,
    currency,
    date,
    description: description || null,
    attachment_url: attachmentUrl,
  });

  if (error) return { error: "No se pudo registrar el gasto" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function createRecurringExpense(values: RecurringExpenseFormValues) {
  const parsed = recurringExpenseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { name, category_id, amount, currency, day_of_month, active } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("recurring_expenses").insert({
    name,
    category_id: category_id || null,
    amount,
    currency,
    day_of_month,
    active,
  });

  if (error) return { error: "No se pudo crear el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function updateRecurringExpense(id: string, values: RecurringExpenseFormValues) {
  const parsed = recurringExpenseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { name, category_id, amount, currency, day_of_month, active } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ name, category_id: category_id || null, amount, currency, day_of_month, active })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function toggleRecurringExpenseActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ active }).eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);

  if (error) return { error: "No se pudo borrar el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function generateMonthlyReportExcel(month: string) {
  if (!MONTH_PATTERN.test(month)) return { error: "Mes inválido" };

  const data = await loadMonthlyReportData(month);
  const label = monthLabel(month);
  const buffer = await buildMonthlyReportWorkbook(data, label);

  return {
    error: null,
    base64: Buffer.from(buffer).toString("base64"),
    filename: `winf-finanzas-${month}.xlsx`,
  };
}

export async function generateMonthlyReportPdf(month: string) {
  if (!MONTH_PATTERN.test(month)) return { error: "Mes inválido" };

  const data = await loadMonthlyReportData(month);
  const label = monthLabel(month);
  const buffer = await renderToBuffer(<MonthlyReportPdfTemplate data={data} monthLabel={label} />);

  return {
    error: null,
    base64: buffer.toString("base64"),
    filename: `winf-finanzas-${month}.pdf`,
  };
}

export async function getReceiptUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);

  if (error || !data) return { error: "No se pudo generar el enlace del adjunto", url: null };

  return { error: null, url: data.signedUrl };
}
