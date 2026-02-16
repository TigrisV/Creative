// ═══════════════════════════════════════════════════════════════════════
// Grup Rezervasyonu Servisi
// Tek seferde birden fazla oda rezervasyonu, grup yönetimi
// ═══════════════════════════════════════════════════════════════════════

import type { ReservationGroup, Reservation, RoomType, MealPlan } from "./types";
import { createReservation } from "./data-service";
import { calculateStayRate } from "./rate-service";

const LS_KEY = "creative_groups";

// ─── CRUD ───────────────────────────────────────────────────────
function getGroups(): ReservationGroup[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return []; }
}

function saveGroups(groups: ReservationGroup[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(groups));
}

export function getReservationGroups(): ReservationGroup[] {
  return getGroups().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getGroupById(id: string): ReservationGroup | undefined {
  return getGroups().find((g) => g.id === id);
}

export function deleteGroup(id: string): void {
  saveGroups(getGroups().filter((g) => g.id !== id));
}

// ─── Grup Rezervasyonu Oluştur ──────────────────────────────────
export interface GroupRoomRequest {
  roomType: RoomType;
  quantity: number;
  adults: number;
  children: number;
  mealPlan: MealPlan;
}

export interface CreateGroupParams {
  groupName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  companyName?: string;
  checkIn: string;
  checkOut: string;
  rooms: GroupRoomRequest[];
  notes?: string;
}

export async function createGroupReservation(params: CreateGroupParams): Promise<{
  group: ReservationGroup;
  reservations: Reservation[];
}> {
  const groupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const reservations: Reservation[] = [];
  let totalAmount = 0;
  let roomCounter = 0;

  for (const room of params.rooms) {
    for (let q = 0; q < room.quantity; q++) {
      roomCounter++;
      const stayCalc = calculateStayRate(params.checkIn, params.checkOut, room.roomType);

      const res: Reservation = {
        id: `res-grp-${Date.now()}-${roomCounter}`,
        confirmationNumber: `GRP-${Date.now().toString().slice(-6)}-${roomCounter}`,
        guest: {
          id: `g-grp-${Date.now()}-${roomCounter}`,
          firstName: params.contactName.split(" ")[0] || "Grup",
          lastName: params.contactName.split(" ").slice(1).join(" ") || params.groupName,
          email: params.contactEmail,
          phone: params.contactPhone,
          idNumber: "",
          nationality: "TR",
          totalStays: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        },
        roomType: room.roomType,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights: stayCalc.nights,
        adults: room.adults,
        children: room.children,
        status: "confirmed",
        source: "Grup",
        ratePerNight: stayCalc.avgRate,
        totalAmount: stayCalc.totalAmount,
        paidAmount: 0,
        balance: stayCalc.totalAmount,
        mealPlan: room.mealPlan,
        specialRequests: params.notes,
        groupId,
        groupName: params.groupName,
        createdAt: new Date().toISOString(),
      };

      const saved = await createReservation(res);
      reservations.push(saved);
      totalAmount += stayCalc.totalAmount;
    }
  }

  const group: ReservationGroup = {
    id: groupId,
    name: params.groupName,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    companyName: params.companyName,
    reservationIds: reservations.map((r) => r.id),
    totalRooms: roomCounter,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    totalAmount,
    paidAmount: 0,
    notes: params.notes,
    createdAt: new Date().toISOString(),
  };

  const groups = getGroups();
  groups.unshift(group);
  saveGroups(groups);

  return { group, reservations };
}

// ─── Grup güncelle ──────────────────────────────────────────────
export function updateGroup(id: string, updates: Partial<ReservationGroup>): void {
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === id);
  if (idx >= 0) {
    groups[idx] = { ...groups[idx], ...updates };
    saveGroups(groups);
  }
}

// ─── İstatistikler ──────────────────────────────────────────────
export function getGroupStats(): {
  totalGroups: number;
  totalRooms: number;
  totalAmount: number;
  activeGroups: number;
} {
  const groups = getGroups();
  const today = new Date().toISOString().split("T")[0];
  return {
    totalGroups: groups.length,
    totalRooms: groups.reduce((s, g) => s + g.totalRooms, 0),
    totalAmount: groups.reduce((s, g) => s + g.totalAmount, 0),
    activeGroups: groups.filter((g) => g.checkOut >= today).length,
  };
}
