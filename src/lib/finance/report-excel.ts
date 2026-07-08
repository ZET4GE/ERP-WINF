import ExcelJS from "exceljs";

import { TRANSACTION_ORIGIN_LABEL, TRANSACTION_TYPE_LABEL } from "@/lib/finance/labels";
import type { MonthlyReportData } from "@/lib/finance/monthly-report";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2A30" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
  });
}

export async function buildMonthlyReportWorkbook(data: MonthlyReportData, monthLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WINF ERP";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.columns = [
    { header: "Concepto", key: "concepto", width: 28 },
    { header: "ARS", key: "ars", width: 18 },
    { header: "USD", key: "usd", width: 18 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRow({ concepto: `Reporte financiero — ${monthLabel}` });
  summarySheet.mergeCells("A2:C2");
  summarySheet.addRow({ concepto: "Ingresos", ars: data.ingresoArs, usd: data.ingresoUsd });
  summarySheet.addRow({ concepto: "Egresos", ars: data.egresoArs, usd: data.egresoUsd });
  summarySheet.addRow({ concepto: "Resultado neto", ars: data.netoArs, usd: data.netoUsd });
  summarySheet.getColumn("ars").numFmt = "#,##0.00";
  summarySheet.getColumn("usd").numFmt = "#,##0.00";

  const categorySheet = workbook.addWorksheet("Por categoría");
  categorySheet.columns = [
    { header: "Categoría", key: "name", width: 28 },
    { header: "ARS", key: "ars", width: 18 },
    { header: "USD", key: "usd", width: 18 },
  ];
  styleHeaderRow(categorySheet.getRow(1));
  for (const c of data.categoryBreakdown) {
    categorySheet.addRow({ name: c.name, ars: c.ars, usd: c.usd });
  }
  categorySheet.getColumn("ars").numFmt = "#,##0.00";
  categorySheet.getColumn("usd").numFmt = "#,##0.00";

  const movementsSheet = workbook.addWorksheet("Movimientos");
  movementsSheet.columns = [
    { header: "Fecha", key: "date", width: 14 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Origen", key: "origin", width: 18 },
    { header: "Categoría", key: "category", width: 22 },
    { header: "Descripción", key: "description", width: 40 },
    { header: "Moneda", key: "currency", width: 10 },
    { header: "Monto", key: "amount", width: 16 },
  ];
  styleHeaderRow(movementsSheet.getRow(1));
  for (const t of data.transactions) {
    movementsSheet.addRow({
      date: t.date,
      type: TRANSACTION_TYPE_LABEL[t.type],
      origin: TRANSACTION_ORIGIN_LABEL[t.origin],
      category: t.category?.name ?? "—",
      description: t.description ?? "",
      currency: t.currency,
      amount: t.type === "egreso" ? -t.amount : t.amount,
    });
  }
  movementsSheet.getColumn("amount").numFmt = "#,##0.00";

  return workbook.xlsx.writeBuffer();
}
