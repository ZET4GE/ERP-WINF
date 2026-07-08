import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

import { formatCurrency, formatDate } from "@/lib/format";
import type { DocumentItem, DocumentType } from "@/lib/types/document";

export const TEAL = "#13B5A6";
export const SLATE = "#1F2A30";

export const COMPANY_NAME = "Williams Gutiérrez";
export const COMPANY_ADDRESS = "Morteros, Córdoba, Argentina";
export const COMPANY_PHONE = "+54 9 3562 458009";
export const COMPANY_EMAIL = "contacto@winf.com.ar";
export const COMPANY_TAGLINE = "WINF — Williams Informática | Soluciones IT en Córdoba";

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  presupuesto: "Presupuesto",
  informe_tecnico: "Informe técnico",
  remito_ot: "Remito / Orden de trabajo",
  comprobante: "Comprobante",
};

const CLIENT_LABEL: Record<DocumentType, string> = {
  presupuesto: "Presupuesto para",
  informe_tecnico: "Informe para",
  remito_ot: "Remito / OT para",
  comprobante: "Comprobante para",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#1a1a1a",
    fontFamily: "Helvetica",
  },
  card: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e3e3e3",
    borderRadius: 8,
    padding: 26,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
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
  docNumber: { fontSize: 20, fontWeight: 700, color: SLATE, marginTop: 4 },
  docDate: { fontSize: 8.5, color: "#666", marginTop: 6 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#eee", marginVertical: 16 },
  sectionLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  clientName: { fontSize: 13, fontWeight: 700, color: "#111" },
  clientLine: { fontSize: 9, color: "#666", marginTop: 2 },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableHeaderText: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colDesc: { flex: 5 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right", fontWeight: 700 },
  totalBox: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: { fontSize: 13, fontWeight: 700, color: TEAL },
  body: { marginTop: 4, fontSize: 10, lineHeight: 1.5, color: "#333" },
  notes: { marginTop: 20 },
  notesText: { fontSize: 9, color: "#555", lineHeight: 1.4 },
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

// @react-pdf/renderer resuelve `src` haciendo fetch() incluso para paths locales,
// lo que falla en un Server Action (sin URL absoluta). Se embebe como data URI
// leyendo el archivo directo del filesystem para evitar esa resolución de red.
export const LOGO_SRC = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), "public", "logo-winf-icon.png")
).toString("base64")}`;

function ItemsTable({ items, currency }: { items: DocumentItem[]; currency: "ARS" | "USD" }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
        <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
        <Text style={[styles.tableHeaderText, styles.colUnit]}>Precio unit.</Text>
        <Text style={[styles.tableHeaderText, styles.colTotal]}>Subtotal</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.colDesc}>{item.description}</Text>
          <Text style={styles.colQty}>{item.quantity}</Text>
          <Text style={styles.colUnit}>{formatCurrency(item.unit_price, currency)}</Text>
          <Text style={styles.colTotal}>
            {formatCurrency(item.quantity * item.unit_price, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function DocumentPdfTemplate({
  docType,
  number,
  issuedAt,
  validUntil,
  currency,
  clientName,
  clientContact,
  clientAddress,
  items,
  body,
  notes,
  total,
}: {
  docType: DocumentType;
  number: string;
  issuedAt: string;
  validUntil: string | null;
  currency: "ARS" | "USD";
  clientName: string;
  clientContact: string | null;
  clientAddress: string | null;
  items: DocumentItem[];
  body: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
}) {
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
              <Text style={styles.companyLine}>{COMPANY_PHONE}</Text>
              <Text style={styles.companyLine}>{COMPANY_EMAIL}</Text>
            </View>
            <View style={styles.docCol}>
              <Text style={styles.docTypeLabel}>{DOC_TYPE_LABEL[docType]}</Text>
              <Text style={styles.docNumber}>{number}</Text>
              <Text style={styles.docDate}>Fecha: {formatDate(issuedAt)}</Text>
              {validUntil && (
                <Text style={styles.docDate}>Válido hasta: {formatDate(validUntil)}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View>
            <Text style={styles.sectionLabel}>{CLIENT_LABEL[docType]}</Text>
            <Text style={styles.clientName}>{clientName}</Text>
            {clientAddress && <Text style={styles.clientLine}>{clientAddress}</Text>}
            {clientContact && <Text style={styles.clientLine}>{clientContact}</Text>}
          </View>

          <View style={styles.divider} />

          {docType === "informe_tecnico" ? (
            <View style={styles.body}>
              <Text>{body}</Text>
            </View>
          ) : (
            <>
              <ItemsTable items={items} currency={currency} />
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
              </View>
            </>
          )}

          {notes && (
            <View style={styles.notes}>
              <Text style={styles.sectionLabel}>Condiciones</Text>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          )}
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
