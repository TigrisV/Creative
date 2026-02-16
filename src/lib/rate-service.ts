// ═══════════════════════════════════════════════════════════════════════
// Sezonluk Fiyatlandırma Servisi
// Tarih aralığı bazlı dinamik fiyatlandırma, özel günler, indirimler
// ═══════════════════════════════════════════════════════════════════════

import type { RoomType } from "./types";

const LS_KEY = "creative_rate_plans";

export type SeasonType = "low" | "mid" | "high" | "peak" | "special";

export interface RatePlan {
  id: string;
  name: string;
  seasonType: SeasonType;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  rates: Record<RoomType, number>;  // Oda tipi → gecelik fiyat
  minStay: number;         // Minimum konaklama
  isActive: boolean;
  priority: number;        // Çakışmalarda yüksek öncelikli olan kazanır
  createdAt: string;
}

export interface SpecialOffer {
  id: string;
  name: string;
  type: "early-bird" | "last-minute" | "long-stay" | "weekend" | "corporate" | "custom";
  discountPercent: number;
  conditions: {
    minDaysBefore?: number;   // Early bird: X gün önce rez
    maxDaysBefore?: number;   // Last minute: X gün kala
    minNights?: number;       // Long stay: min gece
    daysOfWeek?: number[];    // Weekend: 5,6 (Cuma, Cumartesi)
    promoCode?: string;       // Promosyon kodu
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

const BASE_RATES: Record<RoomType, number> = {
  standard: 1800,
  deluxe: 2500,
  suite: 3500,
  family: 2800,
  king: 2200,
  twin: 1800,
};

const seasonLabels: Record<SeasonType, string> = {
  low: "Düşük Sezon",
  mid: "Orta Sezon",
  high: "Yüksek Sezon",
  peak: "Pik Sezon",
  special: "Özel Dönem",
};

const seasonColors: Record<SeasonType, string> = {
  low: "blue",
  mid: "emerald",
  high: "amber",
  peak: "red",
  special: "purple",
};

export { seasonLabels, seasonColors, BASE_RATES };

// ─── Varsayılan sezon planları ──────────────────────────────────
function getDefaultPlans(): RatePlan[] {
  const year = new Date().getFullYear();
  return [
    {
      id: "rp-low-winter",
      name: "Kış Sezonu (Düşük)",
      seasonType: "low",
      startDate: `${year}-11-01`,
      endDate: `${year + 1}-03-31`,
      rates: { standard: 1200, deluxe: 1800, suite: 2800, family: 2000, king: 1600, twin: 1200 },
      minStay: 1,
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rp-mid-spring",
      name: "İlkbahar (Orta)",
      seasonType: "mid",
      startDate: `${year}-04-01`,
      endDate: `${year}-05-31`,
      rates: { standard: 1600, deluxe: 2200, suite: 3200, family: 2400, king: 2000, twin: 1600 },
      minStay: 1,
      isActive: true,
      priority: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rp-high-summer",
      name: "Yaz Sezonu (Yüksek)",
      seasonType: "high",
      startDate: `${year}-06-01`,
      endDate: `${year}-09-15`,
      rates: { standard: 2400, deluxe: 3200, suite: 4800, family: 3600, king: 2800, twin: 2400 },
      minStay: 2,
      isActive: true,
      priority: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rp-peak-bayram",
      name: "Bayram Dönemi (Pik)",
      seasonType: "peak",
      startDate: `${year}-07-15`,
      endDate: `${year}-08-15`,
      rates: { standard: 3000, deluxe: 4000, suite: 6000, family: 4500, king: 3500, twin: 3000 },
      minStay: 3,
      isActive: true,
      priority: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: "rp-special-nye",
      name: "Yılbaşı Özel",
      seasonType: "special",
      startDate: `${year}-12-28`,
      endDate: `${year + 1}-01-03`,
      rates: { standard: 3500, deluxe: 4500, suite: 7000, family: 5000, king: 4000, twin: 3500 },
      minStay: 2,
      isActive: true,
      priority: 20,
      createdAt: new Date().toISOString(),
    },
  ];
}

// ─── CRUD ───────────────────────────────────────────────────────
function getPlans(): RatePlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults = getDefaultPlans();
  localStorage.setItem(LS_KEY, JSON.stringify(defaults));
  return defaults;
}

function savePlans(plans: RatePlan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(plans));
}

export function getRatePlans(): RatePlan[] {
  return getPlans().sort((a, b) => b.priority - a.priority);
}

export function createRatePlan(plan: Omit<RatePlan, "id" | "createdAt">): RatePlan {
  const plans = getPlans();
  const newPlan: RatePlan = {
    ...plan,
    id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  plans.push(newPlan);
  savePlans(plans);
  return newPlan;
}

export function updateRatePlan(id: string, updates: Partial<RatePlan>): void {
  const plans = getPlans();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx >= 0) {
    plans[idx] = { ...plans[idx], ...updates };
    savePlans(plans);
  }
}

export function deleteRatePlan(id: string): void {
  savePlans(getPlans().filter((p) => p.id !== id));
}

// ─── Fiyat Hesaplama ────────────────────────────────────────────
export function getRateForDate(date: string, roomType: RoomType): number {
  const plans = getPlans()
    .filter((p) => p.isActive && date >= p.startDate && date <= p.endDate)
    .sort((a, b) => b.priority - a.priority);

  if (plans.length > 0) {
    return plans[0].rates[roomType] ?? BASE_RATES[roomType];
  }

  return BASE_RATES[roomType];
}

export function getSeasonForDate(date: string): { plan: RatePlan | null; seasonType: SeasonType | "base" } {
  const plans = getPlans()
    .filter((p) => p.isActive && date >= p.startDate && date <= p.endDate)
    .sort((a, b) => b.priority - a.priority);

  if (plans.length > 0) {
    return { plan: plans[0], seasonType: plans[0].seasonType };
  }
  return { plan: null, seasonType: "base" };
}

export function calculateStayRate(
  checkIn: string,
  checkOut: string,
  roomType: RoomType,
): { totalAmount: number; avgRate: number; nights: number; breakdown: { date: string; rate: number; season: string }[] } {
  const breakdown: { date: string; rate: number; season: string }[] = [];
  let total = 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const rate = getRateForDate(dateStr, roomType);
    const season = getSeasonForDate(dateStr);
    total += rate;
    breakdown.push({
      date: dateStr,
      rate,
      season: season.plan?.name || "Baz Fiyat",
    });
  }

  return {
    totalAmount: total,
    avgRate: Math.round(total / nights),
    nights,
    breakdown,
  };
}

// ─── Özel Teklifler (Offers) ────────────────────────────────────
const LS_OFFERS = "creative_special_offers";

function getOffers(): SpecialOffer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_OFFERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultOffers();
}

function saveOffers(offers: SpecialOffer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_OFFERS, JSON.stringify(offers));
}

function getDefaultOffers(): SpecialOffer[] {
  const year = new Date().getFullYear();
  return [
    {
      id: "off-earlybird",
      name: "Erken Rezervasyon",
      type: "early-bird",
      discountPercent: 15,
      conditions: { minDaysBefore: 30 },
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "off-longstay",
      name: "Uzun Konaklama",
      type: "long-stay",
      discountPercent: 10,
      conditions: { minNights: 7 },
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "off-lastmin",
      name: "Son Dakika",
      type: "last-minute",
      discountPercent: 20,
      conditions: { maxDaysBefore: 3 },
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getSpecialOffers(): SpecialOffer[] {
  return getOffers();
}

export function createSpecialOffer(offer: Omit<SpecialOffer, "id" | "createdAt">): SpecialOffer {
  const offers = getOffers();
  const newOffer: SpecialOffer = {
    ...offer,
    id: `off-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  offers.push(newOffer);
  saveOffers(offers);
  return newOffer;
}

export function updateSpecialOffer(id: string, updates: Partial<SpecialOffer>): void {
  const offers = getOffers();
  const idx = offers.findIndex((o) => o.id === id);
  if (idx >= 0) {
    offers[idx] = { ...offers[idx], ...updates };
    saveOffers(offers);
  }
}

export function deleteSpecialOffer(id: string): void {
  saveOffers(getOffers().filter((o) => o.id !== id));
}

export function calculateDiscount(
  checkIn: string,
  nights: number,
  bookingDate: string = new Date().toISOString().split("T")[0],
): { offer: SpecialOffer | null; discountPercent: number } {
  const offers = getOffers().filter((o) => o.isActive);
  const daysBefore = Math.ceil(
    (new Date(checkIn).getTime() - new Date(bookingDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  for (const offer of offers) {
    const c = offer.conditions;
    if (offer.type === "early-bird" && c.minDaysBefore && daysBefore >= c.minDaysBefore) {
      return { offer, discountPercent: offer.discountPercent };
    }
    if (offer.type === "last-minute" && c.maxDaysBefore && daysBefore <= c.maxDaysBefore && daysBefore >= 0) {
      return { offer, discountPercent: offer.discountPercent };
    }
    if (offer.type === "long-stay" && c.minNights && nights >= c.minNights) {
      return { offer, discountPercent: offer.discountPercent };
    }
  }

  return { offer: null, discountPercent: 0 };
}
