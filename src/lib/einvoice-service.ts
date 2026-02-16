// ═══════════════════════════════════════════════════════════════════════
// e-Fatura / e-Arşiv Servisi
// GİB (Gelir İdaresi Başkanlığı) elektronik fatura entegrasyonu
// ═══════════════════════════════════════════════════════════════════════

import { getHotelSettings, generateInvoiceNumber } from "./hotel-settings";
import type { Reservation } from "./types";

const LS_KEY = "creative_einvoice_logs";

export type EInvoiceStatus = "draft" | "sent" | "accepted" | "rejected" | "cancelled" | "failed";
export type EInvoiceType = "e-fatura" | "e-arsiv";

export interface EInvoiceRecord {
  id: string;
  invoiceNumber: string;
  reservationId: string;
  confirmationNumber: string;
  guestName: string;
  guestTaxNumber?: string;
  type: EInvoiceType;
  // Tutar
  subtotal: number;
  kdvRate: number;
  kdvAmount: number;
  grandTotal: number;
  currency: string;
  // Durum
  status: EInvoiceStatus;
  gibUuid?: string;         // GİB tarafından atanan UUID
  gibEnvelopeId?: string;   // Zarf ID
  sentAt?: string;
  acceptedAt?: string;
  errorMessage?: string;
  // Meta
  pdfUrl?: string;
  xmlContent?: string;
  createdAt: string;
}

export interface EInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  kdvRate: number;
  kdvAmount: number;
}

// ─── Log yönetimi ──────────────────────────────────────────────
function getLogs(): EInvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return []; }
}

function saveLogs(logs: EInvoiceRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(logs));
}

export function getEInvoiceLogs(): EInvoiceRecord[] {
  return getLogs().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getEInvoiceByReservation(reservationId: string): EInvoiceRecord | undefined {
  return getLogs().find((l) => l.reservationId === reservationId && l.status !== "cancelled");
}

// ─── e-Fatura / e-Arşiv Oluştur ve Gönder ─────────────────────
export async function createAndSendEInvoice(
  reservation: Reservation,
  lines: EInvoiceLine[],
  extraInfo?: { guestTaxNumber?: string; companyName?: string },
): Promise<EInvoiceRecord> {
  const hs = getHotelSettings();
  const invoiceNo = generateInvoiceNumber();

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const kdvAmount = lines.reduce((s, l) => s + l.kdvAmount, 0);
  const grandTotal = subtotal + kdvAmount;

  // e-Fatura mükellefi ise e-fatura, değilse e-arşiv
  const invoiceType: EInvoiceType = extraInfo?.guestTaxNumber ? "e-fatura" : "e-arsiv";

  const record: EInvoiceRecord = {
    id: `einv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    invoiceNumber: invoiceNo,
    reservationId: reservation.id,
    confirmationNumber: reservation.confirmationNumber,
    guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
    guestTaxNumber: extraInfo?.guestTaxNumber,
    type: invoiceType,
    subtotal,
    kdvRate: hs.kdvRate,
    kdvAmount,
    grandTotal,
    currency: hs.currency,
    status: "draft",
    createdAt: new Date().toISOString(),
  };

  if (!hs.eInvoiceEnabled) {
    record.status = "draft";
    record.errorMessage = "e-Fatura entegrasyonu devre dışı — sadece taslak oluşturuldu";
    const logs = getLogs();
    logs.unshift(record);
    saveLogs(logs);
    return record;
  }

  if (!hs.eInvoiceApiKey || !hs.eInvoiceApiUrl) {
    record.status = "failed";
    record.errorMessage = "e-Fatura API bilgileri eksik";
    const logs = getLogs();
    logs.unshift(record);
    saveLogs(logs);
    return record;
  }

  // ─── UBL-TR XML oluştur ──────────────────────────────────────
  const ublXml = buildUblTrXml(hs, reservation, lines, invoiceNo, invoiceType, extraInfo);
  record.xmlContent = ublXml;

  try {
    // Gerçek ortamda entegratöre gönderim:
    // const response = await fetch(hs.eInvoiceApiUrl + "/invoices", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/xml",
    //     "Authorization": `Bearer ${hs.eInvoiceApiKey}`,
    //   },
    //   body: ublXml,
    // });
    // const result = await response.json();
    // record.gibUuid = result.uuid;
    // record.gibEnvelopeId = result.envelopeId;

    // Simülasyon
    await new Promise((r) => setTimeout(r, 600));
    record.gibUuid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
    record.gibEnvelopeId = `ENV-${Date.now().toString(36).toUpperCase()}`;
    record.status = "sent";
    record.sentAt = new Date().toISOString();
  } catch (err: any) {
    record.status = "failed";
    record.errorMessage = err?.message || "e-Fatura gönderim hatası";
  }

  const logs = getLogs();
  logs.unshift(record);
  saveLogs(logs);
  return record;
}

// ─── e-Fatura İptal ────────────────────────────────────────────
export async function cancelEInvoice(recordId: string): Promise<void> {
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.id === recordId);
  if (idx >= 0) {
    logs[idx].status = "cancelled";
    saveLogs(logs);
  }
}

// ─── Fatura satırları oluştur (reservation'dan) ────────────────
export function buildInvoiceLines(reservation: Reservation, minibarCharges: number = 0): EInvoiceLine[] {
  const hs = getHotelSettings();
  const kdvRate = hs.kdvRate;
  const lines: EInvoiceLine[] = [];

  // Oda ücretleri
  for (let i = 0; i < reservation.nights; i++) {
    const d = new Date(reservation.checkIn);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
    const amount = reservation.ratePerNight;
    lines.push({
      description: `Konaklama — ${dateStr}`,
      quantity: 1,
      unitPrice: amount,
      amount,
      kdvRate,
      kdvAmount: amount * kdvRate,
    });
  }

  // Minibar
  if (minibarCharges > 0) {
    lines.push({
      description: "Minibar Tüketimi",
      quantity: 1,
      unitPrice: minibarCharges,
      amount: minibarCharges,
      kdvRate,
      kdvAmount: minibarCharges * kdvRate,
    });
  }

  // Ekstra hizmetler
  const extras = reservation.totalAmount - (reservation.ratePerNight * reservation.nights) - minibarCharges;
  if (extras > 0) {
    lines.push({
      description: "Ekstra Hizmetler",
      quantity: 1,
      unitPrice: extras,
      amount: extras,
      kdvRate,
      kdvAmount: extras * kdvRate,
    });
  }

  return lines;
}

// ─── UBL-TR XML Builder ────────────────────────────────────────
function buildUblTrXml(
  hs: ReturnType<typeof getHotelSettings>,
  reservation: Reservation,
  lines: EInvoiceLine[],
  invoiceNo: string,
  invoiceType: EInvoiceType,
  extraInfo?: { guestTaxNumber?: string; companyName?: string },
): string {
  const now = new Date().toISOString();
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const kdvTotal = lines.reduce((s, l) => s + l.kdvAmount, 0);
  const grandTotal = subtotal + kdvTotal;

  const linesXml = lines.map((l, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${hs.currency}">${l.amount.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${hs.currency}">${l.kdvAmount.toFixed(2)}</cbc:TaxAmount>
      </cac:TaxTotal>
      <cac:Item><cbc:Name>${l.description}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${hs.currency}">${l.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ProfileID>${invoiceType === "e-fatura" ? "TICARIFATURA" : "EARSIVFATURA"}</cbc:ProfileID>
  <cbc:ID>${invoiceNo}</cbc:ID>
  <cbc:IssueDate>${now.split("T")[0]}</cbc:IssueDate>
  <cbc:IssueTime>${now.split("T")[1]?.slice(0, 8) || "00:00:00"}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${invoiceType === "e-fatura" ? "SATIS" : "SATIS"}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${hs.currency}</cbc:DocumentCurrencyCode>

  <!-- Satıcı -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${hs.taxNumber}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${hs.hotelName}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${hs.hotelAddress}</cbc:StreetName>
        <cbc:CityName>${hs.hotelCity}</cbc:CityName>
        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${hs.taxOffice}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Alıcı -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${extraInfo?.guestTaxNumber ? "VKN" : "TCKN"}">${extraInfo?.guestTaxNumber || reservation.guest.idNumber || "11111111111"}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${extraInfo?.companyName || `${reservation.guest.firstName} ${reservation.guest.lastName}`}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Vergi toplamı -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${hs.currency}">${kdvTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${hs.currency}">${subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${hs.currency}">${kdvTotal.toFixed(2)}</cbc:TaxAmount>
      <cbc:Percent>${Math.round(hs.kdvRate * 100)}</cbc:Percent>
      <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${hs.currency}">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${hs.currency}">${subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${hs.currency}">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${hs.currency}">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  ${linesXml}
</Invoice>`;
}

// ─── İstatistikler ─────────────────────────────────────────────
export function getEInvoiceStats(): {
  total: number;
  sent: number;
  accepted: number;
  failed: number;
  draft: number;
  totalAmount: number;
} {
  const logs = getLogs();
  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    accepted: logs.filter((l) => l.status === "accepted").length,
    failed: logs.filter((l) => l.status === "failed").length,
    draft: logs.filter((l) => l.status === "draft").length,
    totalAmount: logs.filter((l) => l.status !== "cancelled").reduce((s, l) => s + l.grandTotal, 0),
  };
}
