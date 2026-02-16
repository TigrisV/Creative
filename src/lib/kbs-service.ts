// ═══════════════════════════════════════════════════════════════════════
// KBS - Kimlik Bildirme Sistemi Servisi
// Emniyet Genel Müdürlüğü misafir bildirim entegrasyonu
// ═══════════════════════════════════════════════════════════════════════

import { getHotelSettings } from "./hotel-settings";
import type { Guest, Reservation } from "./types";

const LS_KEY = "creative_kbs_logs";

export type KbsStatus = "pending" | "sent" | "failed" | "cancelled";

export interface KbsRecord {
  id: string;
  reservationId: string;
  confirmationNumber: string;
  guestName: string;
  idNumber: string;
  nationality: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  status: KbsStatus;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

// ─── Kayıt logları ─────────────────────────────────────────────
function getLogs(): KbsRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return []; }
}

function saveLogs(logs: KbsRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(logs));
}

export function getKbsLogs(): KbsRecord[] {
  return getLogs().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── KBS Bildirimi Gönder ──────────────────────────────────────
export async function sendKbsNotification(
  reservation: Reservation,
  roomNumber: string,
): Promise<KbsRecord> {
  const hs = getHotelSettings();
  const guest = reservation.guest;

  const record: KbsRecord = {
    id: `kbs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reservationId: reservation.id,
    confirmationNumber: reservation.confirmationNumber,
    guestName: `${guest.firstName} ${guest.lastName}`,
    idNumber: guest.idNumber || "",
    nationality: guest.nationality || "TR",
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    roomNumber,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (!hs.kbsEnabled) {
    record.status = "pending";
    record.errorMessage = "KBS entegrasyonu devre dışı";
    const logs = getLogs();
    logs.unshift(record);
    saveLogs(logs);
    return record;
  }

  if (!hs.kbsFacilityCode || !hs.kbsUsername || !hs.kbsPassword) {
    record.status = "failed";
    record.errorMessage = "KBS bağlantı bilgileri eksik";
    const logs = getLogs();
    logs.unshift(record);
    saveLogs(logs);
    return record;
  }

  if (!guest.idNumber) {
    record.status = "failed";
    record.errorMessage = "Misafir kimlik numarası girilmemiş";
    const logs = getLogs();
    logs.unshift(record);
    saveLogs(logs);
    return record;
  }

  // ─── KBS SOAP API Çağrısı ──────────────────────────────────
  // Gerçek entegrasyonda Emniyet KBS SOAP web servisine bağlanılır
  // URL: https://kbs1.egm.gov.tr/KBS_GIRIS/KBSServis.asmx
  // Metot: BildirimGonder
  try {
    const payload = buildKbsSoapPayload(hs, guest, reservation, roomNumber);

    // Gerçek ortamda:
    // const response = await fetch("https://kbs1.egm.gov.tr/KBS_GIRIS/KBSServis.asmx", {
    //   method: "POST",
    //   headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://tempuri.org/BildirimGonder" },
    //   body: payload,
    // });

    // Simülasyon: başarılı bildirim
    await new Promise((r) => setTimeout(r, 500));

    record.status = "sent";
    record.sentAt = new Date().toISOString();
  } catch (err: any) {
    record.status = "failed";
    record.errorMessage = err?.message || "Bağlantı hatası";
  }

  const logs = getLogs();
  logs.unshift(record);
  saveLogs(logs);
  return record;
}

// ─── KBS İptal Bildirimi ───────────────────────────────────────
export async function cancelKbsNotification(recordId: string): Promise<void> {
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.id === recordId);
  if (idx >= 0) {
    logs[idx].status = "cancelled";
    saveLogs(logs);
  }
}

// ─── KBS SOAP Payload Builder ──────────────────────────────────
function buildKbsSoapPayload(
  hs: ReturnType<typeof getHotelSettings>,
  guest: Guest,
  reservation: Reservation,
  roomNumber: string,
): string {
  const isTC = guest.nationality === "TR" || guest.nationality === "Türkiye";
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Body>
    <tem:BildirimGonder>
      <tem:TesisKodu>${hs.kbsFacilityCode}</tem:TesisKodu>
      <tem:KullaniciAdi>${hs.kbsUsername}</tem:KullaniciAdi>
      <tem:Sifre>${hs.kbsPassword}</tem:Sifre>
      <tem:Bildirim>
        <tem:KimlikTipi>${isTC ? "TC" : "PASAPORT"}</tem:KimlikTipi>
        <tem:KimlikNo>${guest.idNumber}</tem:KimlikNo>
        <tem:Ad>${guest.firstName}</tem:Ad>
        <tem:Soyad>${guest.lastName}</tem:Soyad>
        <tem:Uyruk>${guest.nationality || "TR"}</tem:Uyruk>
        <tem:DogumTarihi>${guest.birthDate || ""}</tem:DogumTarihi>
        <tem:Cinsiyet>${guest.gender === "female" ? "K" : "E"}</tem:Cinsiyet>
        <tem:GirisTarihi>${reservation.checkIn}</tem:GirisTarihi>
        <tem:CikisTarihi>${reservation.checkOut}</tem:CikisTarihi>
        <tem:OdaNo>${roomNumber}</tem:OdaNo>
        <tem:GelisSebebi>TURİZM</tem:GelisSebebi>
      </tem:Bildirim>
    </tem:BildirimGonder>
  </soap:Body>
</soap:Envelope>`;
}

// ─── Toplu durum kontrolü ──────────────────────────────────────
export function getKbsStats(): { total: number; sent: number; failed: number; pending: number } {
  const logs = getLogs();
  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    pending: logs.filter((l) => l.status === "pending").length,
  };
}
