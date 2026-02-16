// ═══════════════════════════════════════════════════════════════════════
// Lisans Sistemi
// Deneme süresi, aktivasyon anahtarı, lisans doğrulama
// ═══════════════════════════════════════════════════════════════════════

const LS_KEY = "creative_license";

export type LicenseType = "trial" | "basic" | "professional" | "enterprise";
export type LicenseStatus = "active" | "expired" | "suspended";

export interface LicenseInfo {
  type: LicenseType;
  status: LicenseStatus;
  activationKey: string;
  activatedAt: string;
  expiresAt: string;
  trialStartedAt: string;
  maxRooms: number;
  maxUsers: number;
  features: string[];
  companyName: string;
  contactEmail: string;
}

const TRIAL_DAYS = 30;

const licenseTiers: Record<LicenseType, { name: string; maxRooms: number; maxUsers: number; features: string[]; price: string }> = {
  trial: {
    name: "Deneme",
    maxRooms: 50,
    maxUsers: 3,
    features: ["dashboard", "reservations", "front-desk", "rooms", "guests", "housekeeping", "billing", "reports"],
    price: "Ücretsiz (30 gün)",
  },
  basic: {
    name: "Temel",
    maxRooms: 50,
    maxUsers: 5,
    features: ["dashboard", "reservations", "front-desk", "rooms", "guests", "housekeeping", "billing", "reports", "night-audit"],
    price: "₺2.500/ay",
  },
  professional: {
    name: "Profesyonel",
    maxRooms: 200,
    maxUsers: 15,
    features: ["dashboard", "reservations", "front-desk", "rooms", "guests", "housekeeping", "billing", "reports", "night-audit", "channel-manager", "kbs", "e-invoice", "rate-plans", "staff-portal"],
    price: "₺5.000/ay",
  },
  enterprise: {
    name: "Kurumsal",
    maxRooms: 9999,
    maxUsers: 999,
    features: ["all"],
    price: "İletişime geçin",
  },
};

export { licenseTiers };

// ─── Varsayılan lisans (deneme) ─────────────────────────────────
function getDefaultLicense(): LicenseInfo {
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + TRIAL_DAYS);

  return {
    type: "trial",
    status: "active",
    activationKey: "",
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    trialStartedAt: now.toISOString(),
    maxRooms: licenseTiers.trial.maxRooms,
    maxUsers: licenseTiers.trial.maxUsers,
    features: licenseTiers.trial.features,
    companyName: "",
    contactEmail: "",
  };
}

// ─── Getter ─────────────────────────────────────────────────────
export function getLicenseInfo(): LicenseInfo {
  if (typeof window === "undefined") return getDefaultLicense();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const license: LicenseInfo = JSON.parse(raw);
      // Süre kontrolü
      if (new Date(license.expiresAt) < new Date() && license.type === "trial") {
        license.status = "expired";
      }
      return license;
    }
  } catch {}
  const def = getDefaultLicense();
  localStorage.setItem(LS_KEY, JSON.stringify(def));
  return def;
}

// ─── Aktivasyon ─────────────────────────────────────────────────
export function activateLicense(key: string): { success: boolean; error?: string; license?: LicenseInfo } {
  // Anahtar formatı: XXXX-XXXX-XXXX-XXXX
  const cleaned = key.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned)) {
    return { success: false, error: "Geçersiz anahtar formatı. XXXX-XXXX-XXXX-XXXX formatında olmalıdır." };
  }

  // Gerçek ortamda: sunucuya doğrulama isteği gönderilir
  // const response = await fetch("https://license.creativehotel.com/activate", { ... });

  // Anahtar prefix'ine göre lisans tipi belirle (simülasyon)
  let type: LicenseType = "basic";
  if (cleaned.startsWith("PRO-")) type = "professional";
  else if (cleaned.startsWith("ENT-")) type = "enterprise";

  const tier = licenseTiers[type];
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);

  const license: LicenseInfo = {
    type,
    status: "active",
    activationKey: cleaned,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    trialStartedAt: getLicenseInfo().trialStartedAt,
    maxRooms: tier.maxRooms,
    maxUsers: tier.maxUsers,
    features: tier.features,
    companyName: "",
    contactEmail: "",
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(license));
  }

  return { success: true, license };
}

// ─── Durum kontrolleri ──────────────────────────────────────────
export function isTrialExpired(): boolean {
  const license = getLicenseInfo();
  if (license.type !== "trial") return false;
  return new Date(license.expiresAt) < new Date();
}

export function getTrialDaysRemaining(): number {
  const license = getLicenseInfo();
  if (license.type !== "trial") return -1;
  const remaining = Math.ceil(
    (new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, remaining);
}

export function hasFeature(feature: string): boolean {
  const license = getLicenseInfo();
  if (license.status !== "active") return false;
  if (license.features.includes("all")) return true;
  return license.features.includes(feature);
}

export function canAddRoom(currentRoomCount: number): boolean {
  const license = getLicenseInfo();
  return currentRoomCount < license.maxRooms;
}

export function canAddUser(currentUserCount: number): boolean {
  const license = getLicenseInfo();
  return currentUserCount < license.maxUsers;
}

// ─── Lisansı sıfırla (deneme) ───────────────────────────────────
export function resetToTrial(): void {
  const def = getDefaultLicense();
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(def));
  }
}
