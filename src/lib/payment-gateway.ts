// ═══════════════════════════════════════════════════════════════════════
// Ödeme Gateway Servisi
// Sanal POS entegrasyonu (iyzico, PayTR, Param, Garanti vb.)
// ═══════════════════════════════════════════════════════════════════════

const LS_KEY = "creative_payment_config";
const LS_TRANSACTIONS = "creative_payment_transactions";

export type PaymentProvider = "iyzico" | "paytr" | "param" | "garanti" | "akbank" | "yapikredi" | "isbank" | "none";

export type TransactionStatus = "pending" | "processing" | "success" | "failed" | "refunded" | "cancelled";

export interface PaymentConfig {
  provider: PaymentProvider;
  apiKey: string;
  secretKey: string;
  merchantId: string;
  isTestMode: boolean;
  isEnabled: boolean;
  // Provider-specific
  baseUrl: string;
  callbackUrl: string;
}

export interface PaymentTransaction {
  id: string;
  reservationId: string;
  confirmationNumber: string;
  guestName: string;
  amount: number;
  currency: string;
  method: "credit-card" | "debit-card" | "bank-transfer" | "cash";
  status: TransactionStatus;
  // Kart bilgileri (masked)
  cardLastFour?: string;
  cardBrand?: string;
  // Provider response
  providerTxId?: string;
  providerStatus?: string;
  errorMessage?: string;
  // Taksit
  installments?: number;
  // Zaman
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
}

const defaultConfig: PaymentConfig = {
  provider: "none",
  apiKey: "",
  secretKey: "",
  merchantId: "",
  isTestMode: true,
  isEnabled: false,
  baseUrl: "",
  callbackUrl: "",
};

const providerDefaults: Record<PaymentProvider, { name: string; baseUrl: string }> = {
  iyzico: { name: "iyzico", baseUrl: "https://sandbox-api.iyzipay.com" },
  paytr: { name: "PayTR", baseUrl: "https://www.paytr.com/odeme/api/get-token" },
  param: { name: "Param (Türkiye İş Bankası)", baseUrl: "https://test-dmz.param.com.tr/turkpos.ws/service_turkpos_prod.asmx" },
  garanti: { name: "Garanti BBVA Sanal POS", baseUrl: "https://sanalposprovtest.garanti.com.tr/VPServlet" },
  akbank: { name: "Akbank Sanal POS", baseUrl: "https://www.sanalakpos.com/fim/api" },
  yapikredi: { name: "Yapı Kredi Sanal POS", baseUrl: "https://posnet.yapikredi.com.tr/PosnetWebService/XML" },
  isbank: { name: "İş Bankası Sanal POS", baseUrl: "https://sanalpos.isbank.com.tr" },
  none: { name: "Yok (Manuel)", baseUrl: "" },
};

export { providerDefaults };

// ─── Config ─────────────────────────────────────────────────────
export function getPaymentConfig(): PaymentConfig {
  if (typeof window === "undefined") return defaultConfig;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {}
  return defaultConfig;
}

export function savePaymentConfig(config: Partial<PaymentConfig>): PaymentConfig {
  const current = getPaymentConfig();
  const merged = { ...current, ...config };
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  }
  return merged;
}

// ─── Transactions ───────────────────────────────────────────────
function getTxs(): PaymentTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_TRANSACTIONS) || "[]");
  } catch { return []; }
}

function saveTxs(txs: PaymentTransaction[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(txs));
  }
}

export function getPaymentTransactions(): PaymentTransaction[] {
  return getTxs().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransactionsByReservation(reservationId: string): PaymentTransaction[] {
  return getTxs().filter((t) => t.reservationId === reservationId);
}

// ─── Ödeme İşlemi Başlat ───────────────────────────────────────
export async function processPayment(params: {
  reservationId: string;
  confirmationNumber: string;
  guestName: string;
  amount: number;
  currency?: string;
  method: "credit-card" | "debit-card" | "bank-transfer" | "cash";
  cardLastFour?: string;
  cardBrand?: string;
  installments?: number;
}): Promise<PaymentTransaction> {
  const config = getPaymentConfig();

  const tx: PaymentTransaction = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reservationId: params.reservationId,
    confirmationNumber: params.confirmationNumber,
    guestName: params.guestName,
    amount: params.amount,
    currency: params.currency || "TRY",
    method: params.method,
    status: "pending",
    cardLastFour: params.cardLastFour,
    cardBrand: params.cardBrand,
    installments: params.installments,
    createdAt: new Date().toISOString(),
  };

  // Nakit / Havale — hemen başarılı
  if (params.method === "cash" || params.method === "bank-transfer") {
    tx.status = "success";
    tx.completedAt = new Date().toISOString();
    const txs = getTxs();
    txs.unshift(tx);
    saveTxs(txs);
    return tx;
  }

  // Kart ödemesi — gateway'e gönder
  if (!config.isEnabled || config.provider === "none") {
    // Gateway yoksa simülasyon
    tx.status = "success";
    tx.completedAt = new Date().toISOString();
    tx.providerTxId = `SIM-${Date.now().toString(36).toUpperCase()}`;
    tx.providerStatus = "simulated";
    const txs = getTxs();
    txs.unshift(tx);
    saveTxs(txs);
    return tx;
  }

  // Gerçek gateway çağrısı
  tx.status = "processing";
  try {
    switch (config.provider) {
      case "iyzico":
        await processIyzico(config, tx);
        break;
      case "paytr":
        await processPayTR(config, tx);
        break;
      default:
        await processGenericPOS(config, tx);
        break;
    }
  } catch (err: any) {
    tx.status = "failed";
    tx.errorMessage = err?.message || "Ödeme işlemi başarısız";
  }

  const txs = getTxs();
  txs.unshift(tx);
  saveTxs(txs);
  return tx;
}

// ─── İade ───────────────────────────────────────────────────────
export async function refundPayment(transactionId: string): Promise<{ success: boolean; error?: string }> {
  const txs = getTxs();
  const idx = txs.findIndex((t) => t.id === transactionId);
  if (idx < 0) return { success: false, error: "İşlem bulunamadı" };
  if (txs[idx].status !== "success") return { success: false, error: "Sadece başarılı işlemler iade edilebilir" };

  // Gerçek ortamda gateway'den iade
  txs[idx].status = "refunded";
  txs[idx].refundedAt = new Date().toISOString();
  saveTxs(txs);
  return { success: true };
}

// ─── Provider Implementations (Simülasyon + Yapı) ───────────────
async function processIyzico(config: PaymentConfig, tx: PaymentTransaction): Promise<void> {
  // Gerçek iyzico entegrasyonu:
  // const request = {
  //   locale: "tr",
  //   conversationId: tx.id,
  //   price: tx.amount.toFixed(2),
  //   paidPrice: tx.amount.toFixed(2),
  //   currency: tx.currency,
  //   installment: tx.installments || 1,
  //   paymentCard: { cardHolderName: tx.guestName, cardNumber: "...", expireMonth: "...", expireYear: "...", cvc: "..." },
  // };
  // const response = await fetch(config.baseUrl + "/payment/auth", { method: "POST", headers: { ... }, body: JSON.stringify(request) });

  await new Promise((r) => setTimeout(r, 800));
  tx.status = "success";
  tx.completedAt = new Date().toISOString();
  tx.providerTxId = `IYZ-${Date.now().toString(36).toUpperCase()}`;
  tx.providerStatus = "SUCCESS";
}

async function processPayTR(config: PaymentConfig, tx: PaymentTransaction): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  tx.status = "success";
  tx.completedAt = new Date().toISOString();
  tx.providerTxId = `PTR-${Date.now().toString(36).toUpperCase()}`;
  tx.providerStatus = "success";
}

async function processGenericPOS(config: PaymentConfig, tx: PaymentTransaction): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  tx.status = "success";
  tx.completedAt = new Date().toISOString();
  tx.providerTxId = `POS-${Date.now().toString(36).toUpperCase()}`;
  tx.providerStatus = "approved";
}

// ─── İstatistikler ──────────────────────────────────────────────
export function getPaymentStats(): {
  totalTransactions: number;
  totalAmount: number;
  successCount: number;
  failedCount: number;
  refundedAmount: number;
} {
  const txs = getTxs();
  return {
    totalTransactions: txs.length,
    totalAmount: txs.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0),
    successCount: txs.filter((t) => t.status === "success").length,
    failedCount: txs.filter((t) => t.status === "failed").length,
    refundedAmount: txs.filter((t) => t.status === "refunded").reduce((s, t) => s + t.amount, 0),
  };
}
