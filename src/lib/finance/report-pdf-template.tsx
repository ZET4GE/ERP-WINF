import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_ORIGIN_LABEL, TRANSACTION_TYPE_LABEL } from "@/lib/finance/labels";
import {
  TEAL,
  SLATE,
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_TAGLINE,
  LOGO_SRC,
} from "@/lib/documents/pdf-template";
import type { MonthlyReportData } from "@/lib/finance/monthly-report";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: "#1a1a1a", fontFamily: "Helvetica" },
  card: { flexGrow: 1, borderWidth: 1, borderColor: "#e3e3e3", borderRadius: 8, padding: 26 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyCol: { flexDirection: "column", gap: 3 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  logo: { width: 26, height: 26 },
  logoText: { fontSize: 15, fontWeight: 700, color: SLATE, letterSpacing: 0.5 },
  companyName: { fontSize: 12, fontWeight: 700, color: "#111" },
  companyLine: { fontSize: 8.5, color: "#666" },
  docCol: { alignItems: "flex-end" },
  docTypeLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docNumber: { fontSize: 18, fontWeight: 700, color: SLATE, marginTop: 4, textTransform: "capitalize" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#eee", marginVertical: 14 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  kpiBox: { flex: 1, borderRadius: 6, backgroundColor: "#f5f5f5", padding: 10 },
  kpiLabel: { fontSize: 7.5, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  sectionLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
  },
  table: { marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colDate: { flex: 1.4 },
  colType: { flex: 1.3 },
  colOrigin: { flex: 1.6 },
  colCategory: { flex: 1.8 },
  colDesc: { flex: 3 },
  colAmount: { flex: 1.5, textAlign: "right", fontWeight: 700 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaa" },
});

export function MonthlyReportPdfTemplate({ data, monthLabel }: { data: MonthlyReportData; monthLabel: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.companyCol}>
              <View style={styles.logoRow}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not an <img> */}
                <Image src={LOGO_SRC} style={styles.logo} />
                <Text style={styles.logoText}>WINF</Text>
              </View>
              <Text style={styles.companyName}>{COMPANY_NAME}</Text>
              <Text style={styles.companyLine}>{COMPANY_ADDRESS}</Text>
            </View>
            <View style={styles.docCol}>
              <Text style={styles.docTypeLabel}>Reporte financiero mensual</Text>
              <Text style={styles.docNumber}>{monthLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Ingresos</Text>
              <Text style={[styles.kpiValue, { color: TEAL }]}>
                {formatCurrency(data.ingresoArs, "ARS")}
              </Text>
              {data.ingresoUsd > 0 && (
                <Text style={styles.companyLine}>+ {formatCurrency(data.ingresoUsd, "USD")}</Text>
              )}
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Egresos</Text>
              <Text style={[styles.kpiValue, { color: "#c0392b" }]}>
                {formatCurrency(data.egresoArs, "ARS")}
              </Text>
              {data.egresoUsd > 0 && (
                <Text style={styles.companyLine}>+ {formatCurrency(data.egresoUsd, "USD")}</Text>
              )}
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Resultado neto</Text>
              <Text style={[styles.kpiValue, { color: SLATE }]}>
                {formatCurrency(data.netoArs, "ARS")}
              </Text>
              {data.netoUsd !== 0 && (
                <Text style={styles.companyLine}>+ {formatCurrency(data.netoUsd, "USD")}</Text>
              )}
            </View>
          </View>

          <Text style={styles.sectionLabel}>Egresos por categoría</Text>
          {data.categoryBreakdown.length === 0 ? (
            <Text style={styles.companyLine}>Sin egresos este mes.</Text>
          ) : (
            data.categoryBreakdown.map((c) => (
              <View key={c.name} style={styles.categoryRow}>
                <Text>{c.name}</Text>
                <Text style={{ fontWeight: 700 }}>
                  {formatCurrency(c.ars, "ARS")}
                  {c.usd > 0 ? ` + ${formatCurrency(c.usd, "USD")}` : ""}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.sectionLabel}>Movimientos ({data.transactions.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDate]}>Fecha</Text>
              <Text style={[styles.tableHeaderText, styles.colType]}>Tipo</Text>
              <Text style={[styles.tableHeaderText, styles.colOrigin]}>Origen</Text>
              <Text style={[styles.tableHeaderText, styles.colCategory]}>Categoría</Text>
              <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>Monto</Text>
            </View>
            {data.transactions.map((t) => (
              <View key={t.id} style={styles.tableRow}>
                <Text style={styles.colDate}>{formatDate(t.date)}</Text>
                <Text style={styles.colType}>{TRANSACTION_TYPE_LABEL[t.type]}</Text>
                <Text style={styles.colOrigin}>{TRANSACTION_ORIGIN_LABEL[t.origin]}</Text>
                <Text style={styles.colCategory}>{t.category?.name ?? "—"}</Text>
                <Text style={styles.colDesc}>{t.description ?? "—"}</Text>
                <Text style={styles.colAmount}>
                  {t.type === "egreso" ? "-" : ""}
                  {formatCurrency(t.amount, t.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY_TAGLINE}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
