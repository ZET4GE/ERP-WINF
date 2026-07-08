"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateMonthlyReportExcel, generateMonthlyReportPdf } from "@/app/(dashboard)/finanzas/actions";

function base64ToBlob(base64: string, type: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function downloadBase64(base64: string, filename: string, type: string) {
  const url = URL.createObjectURL(base64ToBlob(base64, type));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyReportCard() {
  const [month, setMonth] = useState(currentMonth());
  const [isExcelPending, startExcelTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();

  function handleExcel() {
    startExcelTransition(async () => {
      const result = await generateMonthlyReportExcel(month);
      if (result.error || !result.base64) {
        toast.error(result.error ?? "No se pudo generar el Excel");
        return;
      }
      downloadBase64(
        result.base64,
        result.filename!,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });
  }

  function handlePdf() {
    startPdfTransition(async () => {
      const result = await generateMonthlyReportPdf(month);
      if (result.error || !result.base64) {
        toast.error(result.error ?? "No se pudo generar el PDF");
        return;
      }
      downloadBase64(result.base64, result.filename!, "application/pdf");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reportes mensuales</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Mes</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
        </div>
        <Button variant="outline" onClick={handleExcel} disabled={isExcelPending}>
          <FileSpreadsheet />
          {isExcelPending ? "Generando..." : "Excel"}
        </Button>
        <Button variant="outline" onClick={handlePdf} disabled={isPdfPending}>
          <FileText />
          {isPdfPending ? "Generando..." : "PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
