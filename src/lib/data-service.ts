import type { Reservation, Guest, Room, HousekeepingTask } from "./types";
import { reservations as mockReservations, guests as mockGuests, rooms as mockRooms } from "./mock-data";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase lazy client ──────────────────────────────────────────────
let _sb: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("BURAYA") || key.includes("BURAYA")) return null;
  _sb = createClient(url, key);
  return _sb;
}

function hasSupabase(): boolean {
  try {
    return !!getSupabase();
  } catch {
    return false;
  }
}

// ─── localStorage helpers ──────────────────────────────────────────────
const LS_KEYS = {
  reservations: "creative_reservations",
  guests: "creative_guests",
  rooms: "creative_rooms",
  housekeeping: "creative_housekeeping",
};

// ─── Hard-reset: bump DATA_VERSION to wipe ALL cached data (LS + DB) ──
const DATA_VERSION = "3";
let _lsResetDone = false;
function ensureCleanLS() {
  if (_lsResetDone || typeof window === "undefined") return;
  _lsResetDone = true;
  const currentVer = localStorage.getItem("creative_data_version");
  if (currentVer === DATA_VERSION) return;
  const prefixes = ["sunport_", "velora_", "creatica_", "creative_"];
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && prefixes.some((p) => k.startsWith(p))) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem("creative_data_version", DATA_VERSION);
}

let _dbResetDone = false;
async function ensureCleanDB() {
  if (_dbResetDone) return;
  _dbResetDone = true;
  if (typeof window === "undefined") return;
  const dbVer = localStorage.getItem("creative_db_version");
  if (dbVer === DATA_VERSION) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    // Delete all reservations
    await (sb as any).from("reservations").delete().not("id", "is", null);
    // Reset all rooms to vacant-clean
    await (sb as any).from("rooms").update({
      status: "vacant_clean",
      housekeeping_status: "clean",
    }).not("id", "is", null);
    localStorage.setItem("creative_db_version", DATA_VERSION);
  } catch (e) {
    console.error("DB cleanup failed:", e);
  }
}

function lsGet<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  ensureCleanLS();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════════════════════════
export async function getReservations(): Promise<Reservation[]> {
  await ensureCleanDB();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("reservations")
      .select("*, guests(*), rooms(*, room_types(*))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map(mapDbReservation);
    }
    // DB boş → seed
    return seedReservations();
  }
  return lsGet<Reservation>(LS_KEYS.reservations, mockReservations);
}

export async function createReservation(res: Reservation): Promise<Reservation> {
  const sb = getSupabase();
  if (sb) {
    // Önce guest'i bul veya oluştur
    let guestId = await findOrCreateGuest(res.guest);
    const { data, error } = await (sb as any)
      .from("reservations")
      .insert({
        confirmation_number: res.confirmationNumber,
        guest_id: guestId,
        room_type_id: await getRoomTypeId(res.roomType),
        check_in: res.checkIn,
        check_out: res.checkOut,
        nights: res.nights,
        adults: res.adults,
        children: res.children,
        status: mapStatusToDb(res.status),
        rate_per_night: res.ratePerNight,
        total_amount: res.totalAmount,
        paid_amount: res.paidAmount || 0,
        balance: res.balance,
        source: res.source,
        meal_plan: res.mealPlan || "BB",
        special_requests: res.specialRequests,
      })
      .select("*, guests(*)")
      .single();
    if (error) throw error;
    return mapDbReservation(data);
  }
  // localStorage
  const all = lsGet<Reservation>(LS_KEYS.reservations, mockReservations);
  all.unshift(res);
  lsSet(LS_KEYS.reservations, all);
  return res;
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status) dbUpdates.status = mapStatusToDb(updates.status);
    if (updates.checkIn) dbUpdates.check_in = updates.checkIn;
    if (updates.checkOut) dbUpdates.check_out = updates.checkOut;
    if (updates.nights !== undefined) dbUpdates.nights = updates.nights;
    if (updates.adults !== undefined) dbUpdates.adults = updates.adults;
    if (updates.children !== undefined) dbUpdates.children = updates.children;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
    if (updates.paidAmount !== undefined) {
      dbUpdates.balance = (updates.totalAmount ?? 0) - updates.paidAmount;
    }
    if (updates.ratePerNight !== undefined) dbUpdates.rate_per_night = updates.ratePerNight;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.mealPlan !== undefined) dbUpdates.meal_plan = updates.mealPlan;
    if (updates.specialRequests !== undefined) dbUpdates.special_requests = updates.specialRequests;
    if (updates.status === "cancelled") dbUpdates.cancelled_at = new Date().toISOString();
    if (updates.status === "checked-in") dbUpdates.checked_in_at = new Date().toISOString();
    if (updates.status === "checked-out") dbUpdates.checked_out_at = new Date().toISOString();
    if (updates.room) dbUpdates.room_id = updates.room.id;

    await (sb as any).from("reservations").update(dbUpdates).eq("id", id);
    return;
  }
  const all = lsGet<Reservation>(LS_KEYS.reservations, mockReservations);
  const idx = all.findIndex((r) => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    lsSet(LS_KEYS.reservations, all);
  }
}

export async function deleteReservation(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await (sb as any).from("reservations").delete().eq("id", id);
    return;
  }
  const all = lsGet<Reservation>(LS_KEYS.reservations, mockReservations);
  lsSet(LS_KEYS.reservations, all.filter((r) => r.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════
// GUESTS
// ═══════════════════════════════════════════════════════════════════════
export async function getGuests(): Promise<Guest[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("guests")
      .select("*")
      .order("last_name");
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map(mapDbGuest);
    }
    return seedGuests();
  }
  return lsGet<Guest>(LS_KEYS.guests, mockGuests);
}

export async function createGuest(guest: Guest): Promise<Guest> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("guests")
      .insert({
        first_name: guest.firstName,
        last_name: guest.lastName,
        email: guest.email || null,
        phone: guest.phone || null,
        id_number: guest.idNumber || null,
        nationality: guest.nationality || null,
        date_of_birth: guest.birthDate || null,
        address: guest.address || null,
        city: guest.city || null,
        country: guest.country || null,
        vip_level: guest.vipLevel || 0,
        notes: guest.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapDbGuest(data);
  }
  const all = lsGet<Guest>(LS_KEYS.guests, mockGuests);
  all.unshift(guest);
  lsSet(LS_KEYS.guests, all);
  return guest;
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName) dbUpdates.first_name = updates.firstName;
    if (updates.lastName) dbUpdates.last_name = updates.lastName;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.idNumber !== undefined) dbUpdates.id_number = updates.idNumber;
    if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.vipLevel !== undefined) dbUpdates.vip_level = updates.vipLevel;
    await (sb as any).from("guests").update(dbUpdates).eq("id", id);
    return;
  }
  const all = lsGet<Guest>(LS_KEYS.guests, mockGuests);
  const idx = all.findIndex((g) => g.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    lsSet(LS_KEYS.guests, all);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════
export async function getRooms(): Promise<Room[]> {
  await ensureCleanDB();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("rooms")
      .select("*, room_types(*)")
      .order("number");
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map(mapDbRoom);
    }
    return seedRooms();
  }
  return lsGet<Room>(LS_KEYS.rooms, mockRooms);
}

// ─── Room-Guest assignment bridge (works for both Supabase & localStorage) ──
const ROOM_GUESTS_KEY = "creative_room_guests";

function _getRoomGuestMap(): Record<string, Guest> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ROOM_GUESTS_KEY) || "{}");
  } catch { return {}; }
}

function _setRoomGuestMap(map: Record<string, Guest>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROOM_GUESTS_KEY, JSON.stringify(map));
}

export function setRoomGuest(roomNumber: string, guest: Guest) {
  const map = _getRoomGuestMap();
  map[roomNumber] = guest;
  _setRoomGuestMap(map);
}

export function clearRoomGuest(roomNumber: string) {
  const map = _getRoomGuestMap();
  delete map[roomNumber];
  _setRoomGuestMap(map);
}

export async function getRoomsWithGuests(): Promise<Room[]> {
  const rooms = await getRooms();
  const guestMap = _getRoomGuestMap();

  let changed = false;
  for (const room of rooms) {
    if (room.status === "occupied") {
      // Occupied room: use guestMap if available, else seed from mock data
      if (guestMap[room.number]) {
        room.currentGuest = guestMap[room.number];
      } else if (room.currentGuest) {
        guestMap[room.number] = room.currentGuest;
        changed = true;
      }
    } else {
      // Non-occupied room: never show a guest; clean stale entries
      room.currentGuest = undefined;
      if (guestMap[room.number]) {
        delete guestMap[room.number];
        changed = true;
      }
    }
  }
  if (changed) _setRoomGuestMap(guestMap);

  return rooms;
}

export async function updateRoom(id: string, updates: Partial<Room>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status) dbUpdates.status = updates.status.replace("-", "_");
    if (updates.housekeepingStatus) dbUpdates.housekeeping_status = updates.housekeepingStatus.replace("-", "_");
    if (updates.number) dbUpdates.number = updates.number;
    await (sb as any).from("rooms").update(dbUpdates).eq("id", id);
    return;
  }
  const all = lsGet<Room>(LS_KEYS.rooms, mockRooms);
  const idx = all.findIndex((r) => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    // Auto-clear guest data when room is no longer occupied
    if (updates.status && updates.status !== "occupied") {
      all[idx].currentGuest = undefined;
      clearRoomGuest(all[idx].number);
    }
    lsSet(LS_KEYS.rooms, all);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS: DB ↔ App type mapping
// ═══════════════════════════════════════════════════════════════════════
function mapStatusToDb(status: string): string {
  return status.replace("-", "_");
}

function mapStatusFromDb(status: string): string {
  return status.replace("_", "-");
}

function mapDbGuest(row: Record<string, any>): Guest {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || "",
    phone: row.phone || "",
    idNumber: row.id_number || "",
    nationality: row.nationality || "",
    gender: undefined,
    birthDate: row.date_of_birth || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    country: row.country || undefined,
    vipLevel: row.vip_level || 0,
    notes: row.notes || undefined,
    totalStays: row.total_stays || 0,
    totalSpent: row.total_spent || 0,
    createdAt: row.created_at,
    lastStayDate: undefined,
  };
}

function mapDbRoom(row: Record<string, any>): Room {
  const rt = row.room_types || {};
  return {
    id: row.id,
    number: row.number,
    floor: row.floor,
    type: rt.code || "standard",
    status: mapStatusFromDb(row.status) as Room["status"],
    housekeepingStatus: mapStatusFromDb(row.housekeeping_status) as Room["housekeepingStatus"],
    maxOccupancy: rt.max_occupancy || 2,
    baseRate: rt.base_rate || 1800,
    amenities: rt.amenities || [],
  };
}

function mapDbReservation(row: Record<string, any>): Reservation {
  const guest = row.guests ? mapDbGuest(row.guests) : {
    id: row.guest_id,
    firstName: "Bilinmeyen",
    lastName: "Misafir",
    email: "",
    phone: "",
    idNumber: "",
    nationality: "",
    totalStays: 0,
    totalSpent: 0,
    createdAt: "",
  };
  const room = row.rooms ? mapDbRoom(row.rooms) : undefined;
  return {
    id: row.id,
    confirmationNumber: row.confirmation_number,
    guest,
    room,
    roomType: row.rooms?.room_types?.code || row.room_types?.code || "standard",
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    adults: row.adults,
    children: row.children,
    status: mapStatusFromDb(row.status) as Reservation["status"],
    ratePerNight: Number(row.rate_per_night),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.total_amount) - Number(row.balance),
    balance: Number(row.balance),
    source: row.source || "Direkt",
    mealPlan: row.meal_plan || "BB",
    specialRequests: row.special_requests || undefined,
    createdAt: row.created_at,
  };
}

// ─── Guest find or create ──────────────────────────────────────────────
async function findOrCreateGuest(guest: Guest): Promise<string> {
  const sb = getSupabase()!;
  // Mevcut guest'i bul
  const { data: existing } = await (sb as any)
    .from("guests")
    .select("id")
    .eq("first_name", guest.firstName)
    .eq("last_name", guest.lastName)
    .single();
  if (existing) return existing.id;

  const { data: created, error } = await (sb as any)
    .from("guests")
    .insert({
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email || null,
      phone: guest.phone || null,
      id_number: guest.idNumber || null,
      nationality: guest.nationality || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

// ─── Room type helper ──────────────────────────────────────────────────
const _rtCache: Record<string, string> = {};
async function getRoomTypeId(typeCode: string): Promise<string> {
  if (_rtCache[typeCode]) return _rtCache[typeCode];
  const sb = getSupabase()!;
  const { data } = await (sb as any)
    .from("room_types")
    .select("id")
    .eq("code", typeCode)
    .single();
  if (data) {
    _rtCache[typeCode] = data.id;
    return data.id;
  }
  // Yoksa oluştur
  const { data: created } = await (sb as any)
    .from("room_types")
    .insert({ name: typeCode, code: typeCode, base_rate: 1800 })
    .select("id")
    .single();
  _rtCache[typeCode] = created.id;
  return created.id;
}

// ═══════════════════════════════════════════════════════════════════════
// SEED: İlk çalıştırmada mock data'yı DB'ye yükle
// ═══════════════════════════════════════════════════════════════════════
async function seedRoomTypes(): Promise<void> {
  const sb = getSupabase()!;
  const types = [
    { name: "Standart", code: "standard", base_rate: 1800, max_occupancy: 2 },
    { name: "Deluxe", code: "deluxe", base_rate: 2500, max_occupancy: 2 },
    { name: "Suite", code: "suite", base_rate: 3500, max_occupancy: 3 },
    { name: "Family", code: "family", base_rate: 2800, max_occupancy: 4 },
    { name: "King", code: "king", base_rate: 2200, max_occupancy: 2 },
    { name: "Twin", code: "twin", base_rate: 1800, max_occupancy: 2 },
  ];
  for (const t of types) {
    await (sb as any).from("room_types").upsert(t, { onConflict: "code" });
  }
}

async function seedGuests(): Promise<Guest[]> {
  const sb = getSupabase()!;
  for (const g of mockGuests) {
    await (sb as any).from("guests").upsert({
      first_name: g.firstName,
      last_name: g.lastName,
      email: g.email || null,
      phone: g.phone || null,
      id_number: g.idNumber || null,
      nationality: g.nationality || null,
      date_of_birth: g.birthDate || null,
      address: g.address || null,
      city: g.city || null,
      country: g.country || null,
      vip_level: g.vipLevel || 0,
      notes: g.notes || null,
      total_stays: g.totalStays || 0,
      total_spent: g.totalSpent || 0,
    }, { onConflict: "email" }).select();
  }
  const { data } = await (sb as any).from("guests").select("*").order("last_name");
  return (data || []).map(mapDbGuest);
}

async function seedRooms(): Promise<Room[]> {
  const sb = getSupabase()!;
  await seedRoomTypes();
  for (const r of mockRooms) {
    const rtId = await getRoomTypeId(r.type);
    await (sb as any).from("rooms").upsert({
      number: r.number,
      floor: r.floor,
      room_type_id: rtId,
      status: r.status.replace("-", "_"),
      housekeeping_status: r.housekeepingStatus.replace("-", "_"),
    }, { onConflict: "number" }).select();
  }
  const { data } = await (sb as any).from("rooms").select("*, room_types(*)").order("number");
  return (data || []).map(mapDbRoom);
}

async function seedReservations(): Promise<Reservation[]> {
  const sb = getSupabase()!;
  await seedRoomTypes();
  // Ensure guests exist
  const guestRows = await seedGuests();
  const guestMap: Record<string, string> = {};
  for (const g of mockGuests) {
    const match = guestRows.find((gr) => gr.firstName === g.firstName && gr.lastName === g.lastName);
    if (match) guestMap[g.id] = match.id;
  }

  for (const r of mockReservations) {
    const guestId = guestMap[r.guest.id];
    if (!guestId) continue;
    const rtId = await getRoomTypeId(r.roomType);
    await (sb as any).from("reservations").upsert({
      confirmation_number: r.confirmationNumber,
      guest_id: guestId,
      room_type_id: rtId,
      check_in: r.checkIn,
      check_out: r.checkOut,
      nights: r.nights,
      adults: r.adults,
      children: r.children,
      status: r.status.replace("-", "_"),
      rate_per_night: r.ratePerNight,
      total_amount: r.totalAmount,
      balance: r.balance,
      source: r.source,
      special_requests: r.specialRequests || null,
    }, { onConflict: "confirmation_number" }).select();
  }

  const { data } = await (sb as any)
    .from("reservations")
    .select("*, guests(*), room_types(code)")
    .order("created_at", { ascending: false });
  return (data || []).map(mapDbReservation);
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT: Supabase durumu
// ═══════════════════════════════════════════════════════════════════════
export { hasSupabase };
