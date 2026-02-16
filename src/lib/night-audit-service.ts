import type { Reservation, Room, FolioItem } from "./types";
import { updateReservation, updateRoom } from "./data-service";

const NIGHT_AUDIT_CHARGES_KEY = "pms_night_audit_charges_v1";
const NIGHT_AUDIT_REPORTS_KEY = "pms_night_audit_reports_v1";

// ─── Persisted Night Audit Charges ─────────────────────────────────
// These are room charges posted by Night Audit, keyed by reservationId
export interface NightAuditCharge {
  id: string;
  reservationId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "charge";
}

export function getNightAuditCharges(): Record<string, NightAuditCharge[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NIGHT_AUDIT_CHARGES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getChargesForReservation(reservationId: string): NightAuditCharge[] {
  const all = getNightAuditCharges();
  return all[reservationId] || [];
}

function saveNightAuditCharges(data: Record<string, NightAuditCharge[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NIGHT_AUDIT_CHARGES_KEY, JSON.stringify(data));
}

// ─── Daily Reports ─────────────────────────────────────────────────
export interface DailyReport {
  id: string;
  auditDate: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  roomRevenue: number;
  fnbRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  totalArrivals: number;
  totalDepartures: number;
  totalNoShows: number;
  roomsPosted: number;
  openBalance: number;
  completedAt: string;
}

export function getDailyReports(): DailyReport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(NIGHT_AUDIT_REPORTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDailyReports(reports: DailyReport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NIGHT_AUDIT_REPORTS_KEY, JSON.stringify(reports));
}

export function getReportForDate(date: string): DailyReport | null {
  return getDailyReports().find((r) => r.auditDate === date) || null;
}

// ─── Night Audit Steps ─────────────────────────────────────────────

const fmt = (d: Date) => d.toISOString().split("T")[0];

export interface AuditResult {
  noShowCount: number;
  chargesPosted: number;
  totalRoomRevenue: number;
  openBalanceCount: number;
  totalOpenBalance: number;
  roomsUpdated: number;
  report: DailyReport;
}

/**
 * Step 1: Mark no-shows — reservations with today's check-in that are still "confirmed"
 */
export async function markNoShows(
  reservations: Reservation[],
  today: Date
): Promise<number> {
  const todayStr = fmt(today);
  const noShows = reservations.filter(
    (r) => r.checkIn === todayStr && r.status === "confirmed"
  );

  for (const res of noShows) {
    await updateReservation(res.id, { status: "no-show" }).catch(() => {});
  }

  return noShows.length;
}

/**
 * Step 2: Post room charges — add a debit entry for each checked-in reservation
 */
export function postRoomCharges(
  reservations: Reservation[],
  today: Date
): { count: number; totalRevenue: number } {
  const todayStr = fmt(today);
  const inHouse = reservations.filter((r) => r.status === "checked-in");

  const allCharges = getNightAuditCharges();
  let count = 0;
  let totalRevenue = 0;

  for (const res of inHouse) {
    // Check if already posted for today
    const existing = allCharges[res.id] || [];
    const alreadyPosted = existing.some((c) => c.date === todayStr);
    if (alreadyPosted) continue;

    const charge: NightAuditCharge = {
      id: `na-${res.id}-${todayStr}`,
      reservationId: res.id,
      date: todayStr,
      description: `Oda Ücreti — Night Audit (${res.room?.number || "?"})`,
      category: "Konaklama",
      amount: res.ratePerNight,
      type: "charge",
    };

    if (!allCharges[res.id]) allCharges[res.id] = [];
    allCharges[res.id].push(charge);
    count++;
    totalRevenue += res.ratePerNight;
  }

  saveNightAuditCharges(allCharges);
  return { count, totalRevenue };
}

/**
 * Step 3: Update checkout rooms to dirty
 */
export async function updateDepartureRooms(
  reservations: Reservation[],
  rooms: Room[],
  today: Date
): Promise<number> {
  const todayStr = fmt(today);
  const departures = reservations.filter(
    (r) => r.checkOut === todayStr && r.status === "checked-in"
  );

  let updated = 0;
  for (const res of departures) {
    if (res.room) {
      const room = rooms.find((rm) => rm.id === res.room!.id);
      if (room && room.status === "occupied") {
        await updateRoom(room.id, { status: "vacant-dirty", housekeepingStatus: "dirty" }).catch(() => {});
        updated++;
      }
    }
  }

  return updated;
}

/**
 * Step 4: Save daily report
 */
export function saveDailyReport(
  reservations: Reservation[],
  rooms: Room[],
  today: Date,
  roomRevenue: number,
  noShowCount: number,
  roomsPosted: number
): DailyReport {
  const todayStr = fmt(today);
  const inHouse = reservations.filter((r) => r.status === "checked-in");
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const occupancyRate = rooms.length ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const arrivals = reservations.filter((r) => r.checkIn === todayStr && (r.status === "checked-in" || r.status === "confirmed")).length;
  const departures = reservations.filter((r) => r.checkOut === todayStr).length;
  const openBalance = inHouse.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);

  const report: DailyReport = {
    id: `dr-${todayStr}`,
    auditDate: todayStr,
    totalRooms: rooms.length,
    occupiedRooms: occupiedCount,
    occupancyRate,
    roomRevenue,
    fnbRevenue: 0,
    otherRevenue: 0,
    totalRevenue: roomRevenue,
    totalArrivals: arrivals,
    totalDepartures: departures,
    totalNoShows: noShowCount,
    roomsPosted,
    openBalance,
    completedAt: new Date().toISOString(),
  };

  // Save to localStorage (replace if same date exists)
  const existing = getDailyReports().filter((r) => r.auditDate !== todayStr);
  existing.push(report);
  saveDailyReports(existing);

  return report;
}

/**
 * Full Night Audit run — orchestrates all steps
 */
export async function runFullNightAudit(
  reservations: Reservation[],
  rooms: Room[],
  today: Date,
  onStep?: (step: string, detail: string) => void
): Promise<AuditResult> {
  // 1. No-shows
  onStep?.("no-show", "No-show kontrolü yapılıyor...");
  const noShowCount = await markNoShows(reservations, today);

  // 2. Post room charges
  onStep?.("post-charges", "Oda ücretleri folio'lara aktarılıyor...");
  const { count: chargesPosted, totalRevenue } = postRoomCharges(reservations, today);

  // 3. Update departure rooms
  onStep?.("room-status", "Çıkış odaları güncelleniyor...");
  const roomsUpdated = await updateDepartureRooms(reservations, rooms, today);

  // 4. Balance check
  onStep?.("balance-check", "Bakiyeler kontrol ediliyor...");
  const openBalances = reservations.filter((r) => r.balance > 0 && r.status === "checked-in");

  // 5. Save daily report
  onStep?.("report", "Günlük rapor kaydediliyor...");
  const report = saveDailyReport(reservations, rooms, today, totalRevenue, noShowCount, chargesPosted);

  return {
    noShowCount,
    chargesPosted,
    totalRoomRevenue: totalRevenue,
    openBalanceCount: openBalances.length,
    totalOpenBalance: openBalances.reduce((s, r) => s + r.balance, 0),
    roomsUpdated,
    report,
  };
}
