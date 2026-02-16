import { Reservation, RoomType } from "./types";

// ─── Types ───────────────────────────────────────────────────────────
export type SyncStatus = "pending" | "syncing" | "synced" | "conflict" | "error";
export type ConflictResolution = "keep-local" | "keep-remote" | "merge" | "dismiss";
export type ChannelSource = "booking" | "expedia" | "agoda" | "direct" | "phone" | "walkin";

export interface OfflineReservation {
  id: string;
  localId: string;
  confirmationNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomType: RoomType;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  ratePerNight: number;
  totalAmount: number;
  source: ChannelSource;
  specialRequests?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  createdOffline: boolean;
  syncedAt?: string;
  conflictId?: string;
  errorMessage?: string;
}

export interface ChannelReservation {
  id: string;
  channelConfirmation: string;
  channel: ChannelSource;
  guestName: string;
  guestEmail: string;
  roomType: RoomType;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  totalAmount: number;
  receivedAt: string;
}

export interface SyncConflict {
  id: string;
  localReservation: OfflineReservation;
  channelReservation: ChannelReservation;
  conflictType: "room-overlap" | "date-overlap" | "overbooking";
  severity: "high" | "medium" | "low";
  description: string;
  suggestedResolution: ConflictResolution;
  resolvedAt?: string;
  resolution?: ConflictResolution;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: "queued" | "sync-start" | "sync-success" | "sync-fail" | "conflict-detected" | "conflict-resolved";
  reservationId: string;
  details: string;
}

// ─── Storage Keys ────────────────────────────────────────────────────
const QUEUE_KEY = "creative_offline_queue";
const CONFLICTS_KEY = "creative_sync_conflicts";
const LOG_KEY = "creative_sync_log";
const CHANNEL_BUFFER_KEY = "creative_channel_buffer";

// ─── Helper: Generate IDs ───────────────────────────────────────────
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateConfirmation(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "CRT-";
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// ─── Date overlap check ─────────────────────────────────────────────
export function datesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── LocalStorage helpers ────────────────────────────────────────────
function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage write failed:", e);
  }
}

// ─── Queue Management ────────────────────────────────────────────────
export function getOfflineQueue(): OfflineReservation[] {
  return getFromStorage<OfflineReservation[]>(QUEUE_KEY, []);
}

export function addToOfflineQueue(data: Omit<OfflineReservation, "id" | "localId" | "confirmationNumber" | "syncStatus" | "createdAt" | "createdOffline">): OfflineReservation {
  const queue = getOfflineQueue();
  const reservation: OfflineReservation = {
    ...data,
    id: generateId("res"),
    localId: generateId("local"),
    confirmationNumber: generateConfirmation(),
    syncStatus: "pending",
    createdAt: new Date().toISOString(),
    createdOffline: true,
  };
  queue.push(reservation);
  saveToStorage(QUEUE_KEY, queue);
  addSyncLog("queued", reservation.id, `Çevrimdışı rezervasyon oluşturuldu: ${reservation.guestName}`);
  return reservation;
}

export function updateQueueItem(id: string, updates: Partial<OfflineReservation>): void {
  const queue = getOfflineQueue();
  const idx = queue.findIndex((r) => r.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    saveToStorage(QUEUE_KEY, queue);
  }
}

export function removeFromQueue(id: string): void {
  const queue = getOfflineQueue().filter((r) => r.id !== id);
  saveToStorage(QUEUE_KEY, queue);
}

export function clearSyncedFromQueue(): void {
  const queue = getOfflineQueue().filter((r) => r.syncStatus !== "synced");
  saveToStorage(QUEUE_KEY, queue);
}

// ─── Channel Buffer (simulated incoming from OTAs) ───────────────────
export function getChannelBuffer(): ChannelReservation[] {
  return getFromStorage<ChannelReservation[]>(CHANNEL_BUFFER_KEY, []);
}

export function addChannelReservation(data: Omit<ChannelReservation, "id" | "receivedAt">): ChannelReservation {
  const buffer = getChannelBuffer();
  const entry: ChannelReservation = {
    ...data,
    id: generateId("ch"),
    receivedAt: new Date().toISOString(),
  };
  buffer.push(entry);
  saveToStorage(CHANNEL_BUFFER_KEY, buffer);
  return entry;
}

export function removeChannelReservation(id: string): void {
  const buffer = getChannelBuffer().filter((r) => r.id !== id);
  saveToStorage(CHANNEL_BUFFER_KEY, buffer);
}

// ─── Conflict Detection ──────────────────────────────────────────────
export function getConflicts(): SyncConflict[] {
  return getFromStorage<SyncConflict[]>(CONFLICTS_KEY, []);
}

export function detectConflicts(localQueue: OfflineReservation[], channelBuffer: ChannelReservation[]): SyncConflict[] {
  const newConflicts: SyncConflict[] = [];
  const existingConflicts = getConflicts();

  for (const local of localQueue) {
    if (local.syncStatus === "synced" || local.syncStatus === "conflict") continue;

    for (const channel of channelBuffer) {
      // Check date + room type overlap
      if (
        local.roomType === channel.roomType &&
        datesOverlap(local.checkIn, local.checkOut, channel.checkIn, channel.checkOut)
      ) {
        // Check if conflict already exists
        const alreadyExists = existingConflicts.some(
          (c) => c.localReservation.id === local.id && c.channelReservation.id === channel.id
        );
        if (alreadyExists) continue;

        const isExactOverlap = local.checkIn === channel.checkIn && local.checkOut === channel.checkOut;
        const conflict: SyncConflict = {
          id: generateId("conf"),
          localReservation: local,
          channelReservation: channel,
          conflictType: isExactOverlap ? "overbooking" : "date-overlap",
          severity: isExactOverlap ? "high" : "medium",
          description: isExactOverlap
            ? `${local.guestName} (lokal) ve ${channel.guestName} (${channel.channel}) aynı ${local.roomType} oda tipinde aynı tarihlerde (${local.checkIn} - ${local.checkOut}) çakışıyor`
            : `${local.guestName} (lokal) ve ${channel.guestName} (${channel.channel}) ${local.roomType} oda tipinde tarih çakışması: ${local.checkIn}-${local.checkOut} ↔ ${channel.checkIn}-${channel.checkOut}`,
          suggestedResolution: isExactOverlap ? "keep-remote" : "merge",
        };
        newConflicts.push(conflict);
        updateQueueItem(local.id, { syncStatus: "conflict", conflictId: conflict.id });
        addSyncLog("conflict-detected", local.id, conflict.description);
      }
    }
  }

  if (newConflicts.length > 0) {
    const all = [...existingConflicts, ...newConflicts];
    saveToStorage(CONFLICTS_KEY, all);
  }

  return newConflicts;
}

export function resolveConflict(conflictId: string, resolution: ConflictResolution): void {
  const conflicts = getConflicts();
  const idx = conflicts.findIndex((c) => c.id === conflictId);
  if (idx === -1) return;

  const conflict = conflicts[idx];
  conflicts[idx] = { ...conflict, resolution, resolvedAt: new Date().toISOString() };
  saveToStorage(CONFLICTS_KEY, conflicts);

  switch (resolution) {
    case "keep-local":
      // Keep local reservation, remove channel one
      updateQueueItem(conflict.localReservation.id, { syncStatus: "synced", syncedAt: new Date().toISOString() });
      removeChannelReservation(conflict.channelReservation.id);
      addSyncLog("conflict-resolved", conflict.localReservation.id, `Çakışma çözüldü: Lokal rezervasyon korundu (${conflict.localReservation.guestName})`);
      break;
    case "keep-remote":
      // Remove local, keep channel
      removeFromQueue(conflict.localReservation.id);
      addSyncLog("conflict-resolved", conflict.localReservation.id, `Çakışma çözüldü: Kanal rezervasyonu korundu (${conflict.channelReservation.guestName} - ${conflict.channelReservation.channel})`);
      break;
    case "merge":
      // Keep both but mark local as synced (assumed different rooms assigned)
      updateQueueItem(conflict.localReservation.id, { syncStatus: "synced", syncedAt: new Date().toISOString() });
      addSyncLog("conflict-resolved", conflict.localReservation.id, `Çakışma çözüldü: Her iki rezervasyon farklı odalara atanarak birleştirildi`);
      break;
    case "dismiss":
      updateQueueItem(conflict.localReservation.id, { syncStatus: "pending", conflictId: undefined });
      addSyncLog("conflict-resolved", conflict.localReservation.id, `Çakışma reddedildi, tekrar senkronizasyon bekliyor`);
      break;
  }
}

export function getUnresolvedConflicts(): SyncConflict[] {
  return getConflicts().filter((c) => !c.resolvedAt);
}

// ─── Sync Simulation ─────────────────────────────────────────────────
export async function syncReservations(): Promise<{
  synced: number;
  conflicts: SyncConflict[];
  errors: number;
}> {
  const queue = getOfflineQueue();
  const channelBuffer = getChannelBuffer();
  const pending = queue.filter((r) => r.syncStatus === "pending");

  if (pending.length === 0) return { synced: 0, conflicts: [], errors: 0 };

  // Step 1: Detect conflicts
  const newConflicts = detectConflicts(pending, channelBuffer);

  // Step 2: Sync non-conflicting items
  let synced = 0;
  let errors = 0;

  for (const res of pending) {
    if (res.syncStatus === "conflict") continue;

    addSyncLog("sync-start", res.id, `Senkronizasyon başladı: ${res.guestName}`);
    updateQueueItem(res.id, { syncStatus: "syncing" });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
      updateQueueItem(res.id, { syncStatus: "error", errorMessage: "Kanal API yanıt vermedi" });
      addSyncLog("sync-fail", res.id, `Senkronizasyon başarısız: ${res.guestName}`);
      errors++;
      continue;
    }

    updateQueueItem(res.id, { syncStatus: "synced", syncedAt: new Date().toISOString() });
    addSyncLog("sync-success", res.id, `Senkronizasyon tamamlandı: ${res.guestName}`);
    synced++;
  }

  return { synced, conflicts: newConflicts, errors };
}

// ─── Sync Log ────────────────────────────────────────────────────────
export function getSyncLog(): SyncLog[] {
  return getFromStorage<SyncLog[]>(LOG_KEY, []);
}

function addSyncLog(action: SyncLog["action"], reservationId: string, details: string): void {
  const logs = getSyncLog();
  logs.unshift({
    id: generateId("log"),
    timestamp: new Date().toISOString(),
    action,
    reservationId,
    details,
  });
  // Keep last 100 logs
  saveToStorage(LOG_KEY, logs.slice(0, 100));
}

export function clearSyncLog(): void {
  saveToStorage(LOG_KEY, []);
}

// ─── Demo: Seed channel data (simulates OTA bookings during offline) ─
export function seedChannelData(): void {
  const existing = getChannelBuffer();
  if (existing.length > 0) return; // Already seeded

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const threeDays = new Date(today);
  threeDays.setDate(threeDays.getDate() + 3);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  addChannelReservation({
    channelConfirmation: "BK-392847",
    channel: "booking",
    guestName: "Hans Müller",
    guestEmail: "hans@email.de",
    roomType: "deluxe",
    checkIn: fmt(tomorrow),
    checkOut: fmt(threeDays),
    nights: 2,
    adults: 2,
    totalAmount: 4800,
  });

  addChannelReservation({
    channelConfirmation: "EXP-119283",
    channel: "expedia",
    guestName: "Maria Garcia",
    guestEmail: "maria@email.es",
    roomType: "suite",
    checkIn: fmt(today),
    checkOut: fmt(dayAfter),
    nights: 2,
    adults: 1,
    totalAmount: 7200,
  });

  addChannelReservation({
    channelConfirmation: "AGD-554412",
    channel: "agoda",
    guestName: "Yuki Tanaka",
    guestEmail: "yuki@email.jp",
    roomType: "standard",
    checkIn: fmt(dayAfter),
    checkOut: fmt(threeDays),
    nights: 1,
    adults: 2,
    totalAmount: 1800,
  });
}
