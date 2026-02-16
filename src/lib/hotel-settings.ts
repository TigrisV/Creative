// ═══════════════════════════════════════════════════════════════════════
// Merkezi Otel Ayarları Servisi
// Tüm uygulama genelinde otel bilgilerini sağlar (fişler, faturalar, KBS vb.)
// ═══════════════════════════════════════════════════════════════════════

const LS_KEY = "creative_hotel_settings";

export interface HotelSettings {
  // Genel
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelWebsite: string;
  hotelStarRating: number;
  // Vergi
  taxNumber: string;          // Vergi Kimlik No
  tradeRegNumber: string;     // Ticaret Sicil No
  taxOffice: string;          // Vergi Dairesi
  mersisNo: string;           // MERSİS No
  // Fatura
  invoicePrefix: string;      // Fatura ön eki (FTR, INV vb.)
  receiptPrefix: string;      // Fiş ön eki (FIS, RCP vb.)
  lastInvoiceNumber: number;  // Son fatura numarası (sıralı)
  lastReceiptNumber: number;  // Son fiş numarası (sıralı)
  kdvRate: number;            // KDV oranı (0.10 = %10)
  // KBS
  kbsEnabled: boolean;
  kbsFacilityCode: string;    // KBS tesis kodu
  kbsUsername: string;
  kbsPassword: string;
  // e-Fatura
  eInvoiceEnabled: boolean;
  eInvoiceProvider: string;   // "gib" | "logo" | "foriba" | "edm" | "uyumsoft"
  eInvoiceApiKey: string;
  eInvoiceApiUrl: string;
  // Para birimi
  currency: string;           // "TRY" | "USD" | "EUR"
  currencySymbol: string;     // "₺" | "$" | "€"
  // Operasyonel
  checkInTime: string;        // "14:00"
  checkOutTime: string;       // "12:00"
  defaultMealPlan: string;    // "BB" | "HB" | "FB" | "AI" | "RO"
  // Tema
  logoUrl: string;
}

const defaultSettings: HotelSettings = {
  hotelName: "Creative Hotel",
  hotelAddress: "Liman Caddesi No: 42",
  hotelCity: "Antalya, Türkiye",
  hotelPhone: "+90 242 000 00 00",
  hotelEmail: "info@creativehotel.com",
  hotelWebsite: "www.creativehotel.com",
  hotelStarRating: 4,
  taxNumber: "1234567890",
  tradeRegNumber: "123456",
  taxOffice: "Antalya Vergi Dairesi",
  mersisNo: "",
  invoicePrefix: "FTR",
  receiptPrefix: "FIS",
  lastInvoiceNumber: 0,
  lastReceiptNumber: 0,
  kdvRate: 0.10,
  kbsEnabled: false,
  kbsFacilityCode: "",
  kbsUsername: "",
  kbsPassword: "",
  eInvoiceEnabled: false,
  eInvoiceProvider: "gib",
  eInvoiceApiKey: "",
  eInvoiceApiUrl: "",
  currency: "TRY",
  currencySymbol: "₺",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  defaultMealPlan: "BB",
  logoUrl: "",
};

// ─── Getter/Setter ────────────────────────────────────────────
let _cached: HotelSettings | null = null;

export function getHotelSettings(): HotelSettings {
  if (_cached) return _cached;
  if (typeof window === "undefined") return { ...defaultSettings };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      _cached = { ...defaultSettings, ...JSON.parse(raw) };
      return _cached!;
    }
  } catch { /* ignore */ }
  _cached = { ...defaultSettings };
  return _cached;
}

export function saveHotelSettings(updates: Partial<HotelSettings>): HotelSettings {
  const current = getHotelSettings();
  const merged = { ...current, ...updates };
  _cached = merged;
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  }
  return merged;
}

// ─── Fatura / Fiş Numarası Üretici ────────────────────────────
export function generateInvoiceNumber(): string {
  const s = getHotelSettings();
  const next = s.lastInvoiceNumber + 1;
  saveHotelSettings({ lastInvoiceNumber: next });
  const year = new Date().getFullYear();
  const padded = next.toString().padStart(6, "0");
  return `${s.invoicePrefix}-${year}-${padded}`;
}

export function generateReceiptNumber(): string {
  const s = getHotelSettings();
  const next = s.lastReceiptNumber + 1;
  saveHotelSettings({ lastReceiptNumber: next });
  const year = new Date().getFullYear();
  const padded = next.toString().padStart(6, "0");
  return `${s.receiptPrefix}-${year}-${padded}`;
}

// ─── Yardımcı ─────────────────────────────────────────────────
export function getLastInvoiceNumber(): number {
  return getHotelSettings().lastInvoiceNumber;
}

export function getLastReceiptNumber(): number {
  return getHotelSettings().lastReceiptNumber;
}

export function formatHotelCurrency(amount: number): string {
  const s = getHotelSettings();
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: s.currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Invalidate cache (ayarlar sayfasından çağrılacak) ─────────
export function invalidateSettingsCache() {
  _cached = null;
}
