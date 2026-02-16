import type { Reservation } from "./types";
import { getHotelSettings, generateInvoiceNumber, generateReceiptNumber } from "./hotel-settings";

function formatTRY(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
}

function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function nowTR(): string {
  return new Date().toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const roomTypeLabels: Record<string, string> = {
  standard: "Standart", deluxe: "Deluxe", suite: "Süit",
  family: "Aile", king: "King", twin: "Twin",
};

function openPrintWindow(html: string) {
  const win = window.open("", "_blank", "width=420,height=700");
  if (!win) { alert("Pop-up engelleyici aktif. Lütfen izin verin."); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ═══════════════════════════════════════════════════════════════
// CHECK-IN FİŞ (Receipt)
// ═══════════════════════════════════════════════════════════════
export function printCheckInReceipt(
  res: Reservation,
  roomNumber: string,
  keycardCount: string,
  depositAmount: number,
  paymentAmount: number,
  paymentMethod: string,
) {
  const methodLabels: Record<string, string> = {
    "credit-card": "Kredi Kartı", "cash": "Nakit", "bank-transfer": "Havale/EFT",
  };

  const hs = getHotelSettings();
  const receiptNo = generateReceiptNumber();

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>Check-in Fişi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; width: 380px; margin: 0 auto; padding: 20px; color: #1a1a1a; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 14px; }
    .header h1 { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 10px; color: #666; margin-top: 2px; }
    .title { text-align: center; font-size: 14px; font-weight: 700; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .row .label { color: #666; }
    .row .value { font-weight: 600; text-align: right; }
    .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #444; margin-bottom: 6px; letter-spacing: 0.5px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; font-weight: 700; border-top: 2px solid #1a1a1a; margin-top: 6px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
    .footer p { margin: 2px 0; }
    @media print { body { width: 100%; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${hs.hotelName}</h1>
    <p>${hs.hotelAddress}, ${hs.hotelCity} | ${hs.hotelPhone}</p>
    <p style="font-size:9px;margin-top:3px;">VKN: ${hs.taxNumber} | ${hs.taxOffice}</p>
  </div>

  <div class="title">Check-in Fişi</div>
  <div class="row" style="margin-bottom:10px;"><span class="label">Fiş No</span><span class="value" style="font-family:monospace;">${receiptNo}</span></div>

  <div class="section-title">Misafir Bilgileri</div>
  <div class="row"><span class="label">Ad Soyad</span><span class="value">${res.guest.firstName} ${res.guest.lastName}</span></div>
  <div class="row"><span class="label">Konfirmasyon No</span><span class="value">${res.confirmationNumber}</span></div>
  ${res.guest.idNumber ? `<div class="row"><span class="label">TC / Pasaport</span><span class="value">${res.guest.idNumber}</span></div>` : ""}

  <div class="divider"></div>

  <div class="section-title">Konaklama Detayları</div>
  <div class="row"><span class="label">Oda No</span><span class="value">${roomNumber}</span></div>
  <div class="row"><span class="label">Oda Tipi</span><span class="value">${roomTypeLabels[res.roomType] || res.roomType}</span></div>
  <div class="row"><span class="label">Giriş Tarihi</span><span class="value">${formatDateTR(res.checkIn)}</span></div>
  <div class="row"><span class="label">Çıkış Tarihi</span><span class="value">${formatDateTR(res.checkOut)}</span></div>
  <div class="row"><span class="label">Gece Sayısı</span><span class="value">${res.nights}</span></div>
  <div class="row"><span class="label">Kişi</span><span class="value">${res.adults} Yetişkin${res.children > 0 ? ` + ${res.children} Çocuk` : ""}</span></div>
  <div class="row"><span class="label">Anahtar Kart</span><span class="value">${keycardCount} adet</span></div>

  <div class="divider"></div>

  <div class="section-title">Ödeme Bilgileri</div>
  <div class="row"><span class="label">Gecelik Ücret</span><span class="value">${formatTRY(res.ratePerNight)}</span></div>
  <div class="row"><span class="label">Toplam Tutar</span><span class="value">${formatTRY(res.totalAmount)}</span></div>
  ${depositAmount > 0 ? `<div class="row"><span class="label">Depozito</span><span class="value">${formatTRY(depositAmount)}</span></div>` : ""}
  ${paymentAmount > 0 ? `<div class="row"><span class="label">Ödeme (${methodLabels[paymentMethod] || paymentMethod})</span><span class="value">${formatTRY(paymentAmount)}</span></div>` : ""}
  <div class="total-row"><span>Kalan Bakiye</span><span>${formatTRY(Math.max(0, res.balance - paymentAmount))}</span></div>

  <div class="footer">
    <p>${receiptNo} | ${nowTR()}</p>
    <p>Bu fiş check-in işleminizin kanıtıdır.</p>
    <p>İyi tatiller dileriz!</p>
    <p>${hs.hotelName} | ${hs.hotelWebsite}</p>
  </div>
</body>
</html>`;

  openPrintWindow(html);
}

// ═══════════════════════════════════════════════════════════════
// CHECK-OUT FATURA (Invoice)
// ═══════════════════════════════════════════════════════════════
export function printCheckOutInvoice(
  res: Reservation,
  minibarCharges: number,
  lastPayment: number,
  paymentMethod: string,
) {
  const methodLabels: Record<string, string> = {
    "credit-card": "Kredi Kartı", "cash": "Nakit", "bank-transfer": "Havale/EFT",
  };

  // Build folio lines
  const lines: { desc: string; amount: number }[] = [];
  for (let i = 0; i < res.nights; i++) {
    const d = new Date(res.checkIn);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
    lines.push({
      desc: `Oda Ücreti — ${roomTypeLabels[res.roomType] || res.roomType} (${dateStr})`,
      amount: res.ratePerNight,
    });
  }
  if (minibarCharges > 0) {
    lines.push({ desc: "Minibar Tüketimi", amount: minibarCharges });
  }
  const extras = res.totalAmount - (res.ratePerNight * res.nights);
  if (extras > 0 && minibarCharges === 0) {
    lines.push({ desc: "Ekstra Hizmetler", amount: extras });
  }

  const totalCharges = lines.reduce((s, l) => s + l.amount, 0);
  const totalPaid = res.paidAmount + lastPayment;
  const finalBalance = Math.max(0, totalCharges - totalPaid);

  const linesHtml = lines.map((l, i) => `
    <tr>
      <td style="padding:4px 0;border-bottom:1px solid #eee;">${i + 1}</td>
      <td style="padding:4px 0;border-bottom:1px solid #eee;">${l.desc}</td>
      <td style="padding:4px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatTRY(l.amount)}</td>
    </tr>`).join("");

  const hs = getHotelSettings();
  const invoiceNo = generateInvoiceNumber();
  const kdvRate = hs.kdvRate;
  const kdvAmount = totalCharges * kdvRate;
  const grandTotal = totalCharges + kdvAmount;

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>Fatura — ${res.confirmationNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; width: 420px; margin: 0 auto; padding: 20px; color: #1a1a1a; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 14px; }
    .hotel h1 { font-size: 15px; font-weight: 700; letter-spacing: 1px; }
    .hotel p { font-size: 10px; color: #666; margin-top: 1px; }
    .invoice-info { text-align: right; }
    .invoice-info .inv-title { font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .invoice-info p { font-size: 10px; color: #666; margin-top: 2px; }
    .guest-info { margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .row .label { color: #666; }
    .row .value { font-weight: 600; text-align: right; }
    .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #444; margin-bottom: 6px; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #666; padding: 4px 0; border-bottom: 2px solid #ddd; }
    th:last-child { text-align: right; }
    .summary { margin-top: 6px; }
    .summary .row { padding: 4px 0; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; margin-top: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; }
    .footer p { margin: 2px 0; }
    .stamp { display: inline-block; border: 2px solid ${finalBalance === 0 ? "#16a34a" : "#dc2626"}; color: ${finalBalance === 0 ? "#16a34a" : "#dc2626"}; padding: 4px 14px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; letter-spacing: 1px; }
    @media print { body { width: 100%; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel">
      <h1>${hs.hotelName}</h1>
      <p>${hs.hotelAddress}, ${hs.hotelCity}</p>
      <p>Tel: ${hs.hotelPhone}</p>
      <p>VKN: ${hs.taxNumber} | ${hs.taxOffice}</p>
      ${hs.mersisNo ? `<p>MERSİS: ${hs.mersisNo}</p>` : ""}
    </div>
    <div class="invoice-info">
      <div class="inv-title">Fatura</div>
      <p>No: ${invoiceNo}</p>
      <p>Tarih: ${nowTR()}</p>
    </div>
  </div>

  <div class="guest-info">
    <div class="section-title">Misafir Bilgileri</div>
    <div class="row"><span class="label">Ad Soyad</span><span class="value">${res.guest.firstName} ${res.guest.lastName}</span></div>
    <div class="row"><span class="label">Konfirmasyon</span><span class="value">${res.confirmationNumber}</span></div>
    ${res.guest.idNumber ? `<div class="row"><span class="label">TC / Pasaport</span><span class="value">${res.guest.idNumber}</span></div>` : ""}
    <div class="row"><span class="label">Oda</span><span class="value">${res.room?.number || "—"} (${roomTypeLabels[res.roomType] || res.roomType})</span></div>
    <div class="row"><span class="label">Giriş</span><span class="value">${formatDateTR(res.checkIn)}</span></div>
    <div class="row"><span class="label">Çıkış</span><span class="value">${formatDateTR(res.checkOut)}</span></div>
    <div class="row"><span class="label">Gece</span><span class="value">${res.nights}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section-title">Hesap Detayı</div>
  <table>
    <thead>
      <tr><th>#</th><th>Açıklama</th><th>Tutar</th></tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <div class="summary">
    <div class="row"><span class="label">Ara Toplam</span><span class="value">${formatTRY(totalCharges)}</span></div>
    <div class="row"><span class="label">KDV (%${Math.round(kdvRate * 100)})</span><span class="value">${formatTRY(kdvAmount)}</span></div>
    <div class="row" style="font-weight:700;"><span class="label">Toplam (KDV Dahil)</span><span class="value">${formatTRY(grandTotal)}</span></div>
    ${res.paidAmount > 0 ? `<div class="row"><span class="label">Önceki Ödemeler</span><span class="value" style="color:#16a34a;">- ${formatTRY(res.paidAmount)}</span></div>` : ""}
    ${lastPayment > 0 ? `<div class="row"><span class="label">Son Ödeme (${methodLabels[paymentMethod] || paymentMethod})</span><span class="value" style="color:#16a34a;">- ${formatTRY(lastPayment)}</span></div>` : ""}
  </div>
  <div class="total-row"><span>GENEL TOPLAM</span><span>${formatTRY(Math.max(0, grandTotal - totalPaid))}</span></div>

  <div style="text-align:center;">
    <div class="stamp">${finalBalance === 0 ? "ÖDENDİ" : `BAKİYE: ${formatTRY(finalBalance)}`}</div>
  </div>

  <div class="footer">
    <p>${invoiceNo} | ${nowTR()}</p>
    <p>Bu belge bilgilendirme amaçlıdır. e-Fatura yerine geçmez.</p>
    <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
    <p>${hs.hotelName} | ${hs.hotelWebsite}</p>
  </div>
</body>
</html>`;

  openPrintWindow(html);
}
