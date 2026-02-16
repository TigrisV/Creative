import type {
  Staff, HousekeepingTaskFull, BarMenuItem, BarOrder, BarOrderItem,
  MaintenanceOrder, MaintenanceCategory, MaintenanceStatus,
} from "./types";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase lazy client ──────────────────────────────────────────
let _sb: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("BURAYA") || key.includes("BURAYA")) return null;
  _sb = createClient(url, key);
  return _sb;
}

// ─── localStorage helpers ──────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

const LS = {
  staff: "creative_staff",
  hkTasks: "creative_hk_tasks",
  barMenu: "creative_bar_menu",
  barOrders: "creative_bar_orders",
  maintenance: "creative_maintenance",
};

// ═══════════════════════════════════════════════════════════════════
// STAFF (Personel)
// ═══════════════════════════════════════════════════════════════════
export async function getStaff(): Promise<Staff[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any).from("staff").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return (data || []).map(mapDbStaff);
  }
  return lsGet<Staff[]>(LS.staff, defaultStaff);
}

export async function loginStaff(pin: string): Promise<Staff | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await (sb as any).from("staff").select("*").eq("pin", pin).eq("is_active", true).single();
    return data ? mapDbStaff(data) : null;
  }
  const all = lsGet<Staff[]>(LS.staff, defaultStaff);
  return all.find((s) => s.pin === pin) || null;
}

// ═══════════════════════════════════════════════════════════════════
// HOUSEKEEPING TASKS
// ═══════════════════════════════════════════════════════════════════
export async function getHousekeepingTasks(): Promise<HousekeepingTaskFull[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("housekeeping_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDbHkTask);
  }
  return lsGet<HousekeepingTaskFull[]>(LS.hkTasks, []);
}

export async function createHousekeepingTask(task: Omit<HousekeepingTaskFull, "id" | "createdAt">): Promise<HousekeepingTaskFull> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("housekeeping_tasks")
      .insert({
        room_number: task.roomNumber,
        floor: task.floor,
        task_type: task.taskType,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assignedTo || null,
        assigned_to_name: task.assignedToName || null,
        notes: task.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapDbHkTask(data);
  }
  const all = lsGet<HousekeepingTaskFull[]>(LS.hkTasks, []);
  const newTask: HousekeepingTaskFull = { ...task, id: `hk-${Date.now()}`, createdAt: new Date().toISOString() };
  all.unshift(newTask);
  lsSet(LS.hkTasks, all);
  return newTask;
}

export async function updateHousekeepingTask(id: string, updates: Partial<HousekeepingTaskFull>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUp: Record<string, unknown> = {};
    if (updates.status) dbUp.status = updates.status;
    if (updates.startedAt) dbUp.started_at = updates.startedAt;
    if (updates.completedAt) dbUp.completed_at = updates.completedAt;
    if (updates.durationMinutes !== undefined) dbUp.duration_minutes = updates.durationMinutes;
    if (updates.issuesFound !== undefined) dbUp.issues_found = updates.issuesFound;
    if (updates.notes !== undefined) dbUp.notes = updates.notes;
    if (updates.assignedTo) dbUp.assigned_to = updates.assignedTo;
    if (updates.assignedToName) dbUp.assigned_to_name = updates.assignedToName;
    if (updates.inspectedBy) dbUp.inspected_by = updates.inspectedBy;
    if (updates.inspectedAt) dbUp.inspected_at = updates.inspectedAt;
    await (sb as any).from("housekeeping_tasks").update(dbUp).eq("id", id);
    return;
  }
  const all = lsGet<HousekeepingTaskFull[]>(LS.hkTasks, []);
  const idx = all.findIndex((t) => t.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; lsSet(LS.hkTasks, all); }
}

// ═══════════════════════════════════════════════════════════════════
// BAR MENU
// ═══════════════════════════════════════════════════════════════════
export async function getBarMenu(): Promise<BarMenuItem[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any).from("bar_menu_items").select("*").eq("is_available", true).order("sort_order");
    if (error) throw error;
    return (data || []).map(mapDbMenuItem);
  }
  return lsGet<BarMenuItem[]>(LS.barMenu, defaultBarMenu);
}

// ═══════════════════════════════════════════════════════════════════
// BAR ORDERS
// ═══════════════════════════════════════════════════════════════════
export async function getBarOrders(): Promise<BarOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("bar_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDbBarOrder);
  }
  return lsGet<BarOrder[]>(LS.barOrders, []);
}

export async function createBarOrder(order: Omit<BarOrder, "id" | "createdAt">): Promise<BarOrder> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("bar_orders")
      .insert({
        room_number: order.roomNumber || null,
        table_number: order.tableNumber || null,
        guest_name: order.guestName || null,
        order_type: order.orderType,
        status: order.status,
        items: order.items,
        total_amount: order.totalAmount,
        payment_method: order.paymentMethod,
        notes: order.notes || null,
        created_by: order.createdBy || null,
        created_by_name: order.createdByName || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapDbBarOrder(data);
  }
  const all = lsGet<BarOrder[]>(LS.barOrders, []);
  const newOrder: BarOrder = { ...order, id: `bo-${Date.now()}`, createdAt: new Date().toISOString() };
  all.unshift(newOrder);
  lsSet(LS.barOrders, all);
  return newOrder;
}

export async function getBarOrdersByRoom(roomNumber: string): Promise<BarOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("bar_orders")
      .select("*")
      .eq("room_number", roomNumber)
      .in("status", ["new", "preparing", "ready", "delivered"])
      .neq("payment_method", "paid")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDbBarOrder);
  }
  const all = lsGet<BarOrder[]>(LS.barOrders, []);
  return all.filter((o) => o.roomNumber === roomNumber && o.status !== "cancelled" && o.paymentMethod !== "paid");
}

export async function markBarOrdersPaid(roomNumber: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await (sb as any)
      .from("bar_orders")
      .update({ payment_method: "paid" })
      .eq("room_number", roomNumber)
      .neq("payment_method", "paid");
    return;
  }
  const all = lsGet<BarOrder[]>(LS.barOrders, []);
  all.forEach((o) => { if (o.roomNumber === roomNumber && o.paymentMethod !== "paid") o.paymentMethod = "paid"; });
  lsSet(LS.barOrders, all);
}

export async function updateBarOrder(id: string, updates: Partial<BarOrder>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUp: Record<string, unknown> = {};
    if (updates.status) dbUp.status = updates.status;
    if (updates.deliveredAt) dbUp.delivered_at = updates.deliveredAt;
    if (updates.notes !== undefined) dbUp.notes = updates.notes;
    await (sb as any).from("bar_orders").update(dbUp).eq("id", id);
    return;
  }
  const all = lsGet<BarOrder[]>(LS.barOrders, []);
  const idx = all.findIndex((o) => o.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; lsSet(LS.barOrders, all); }
}

// ═══════════════════════════════════════════════════════════════════
// MAINTENANCE ORDERS
// ═══════════════════════════════════════════════════════════════════
export async function getMaintenanceOrders(): Promise<MaintenanceOrder[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("maintenance_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapDbMaintenance);
  }
  return lsGet<MaintenanceOrder[]>(LS.maintenance, []);
}

export async function createMaintenanceOrder(order: Omit<MaintenanceOrder, "id" | "createdAt">): Promise<MaintenanceOrder> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("maintenance_orders")
      .insert({
        title: order.title,
        description: order.description || null,
        category: order.category,
        location: order.location,
        room_number: order.roomNumber || null,
        priority: order.priority,
        status: order.status,
        assigned_to: order.assignedTo || null,
        assigned_to_name: order.assignedToName || null,
        reported_by: order.reportedBy || null,
        notes: order.notes || null,
        estimated_minutes: order.estimatedMinutes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapDbMaintenance(data);
  }
  const all = lsGet<MaintenanceOrder[]>(LS.maintenance, []);
  const newOrder: MaintenanceOrder = { ...order, id: `mo-${Date.now()}`, createdAt: new Date().toISOString() };
  all.unshift(newOrder);
  lsSet(LS.maintenance, all);
  return newOrder;
}

export async function updateMaintenanceOrder(id: string, updates: Partial<MaintenanceOrder>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const dbUp: Record<string, unknown> = {};
    if (updates.status) dbUp.status = updates.status;
    if (updates.startedAt) dbUp.started_at = updates.startedAt;
    if (updates.completedAt) dbUp.completed_at = updates.completedAt;
    if (updates.notes !== undefined) dbUp.notes = updates.notes;
    if (updates.partsUsed !== undefined) dbUp.parts_used = updates.partsUsed;
    if (updates.cost !== undefined) dbUp.cost = updates.cost;
    if (updates.assignedTo) dbUp.assigned_to = updates.assignedTo;
    if (updates.assignedToName) dbUp.assigned_to_name = updates.assignedToName;
    await (sb as any).from("maintenance_orders").update(dbUp).eq("id", id);
    return;
  }
  const all = lsGet<MaintenanceOrder[]>(LS.maintenance, []);
  const idx = all.findIndex((o) => o.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; lsSet(LS.maintenance, all); }
}

// ═══════════════════════════════════════════════════════════════════
// DB ↔ App type mappers
// ═══════════════════════════════════════════════════════════════════
function mapDbStaff(row: Record<string, any>): Staff {
  return {
    id: row.id, name: row.name, role: row.role, pin: row.pin,
    phone: row.phone, isActive: row.is_active, floorAssigned: row.floor_assigned,
    createdAt: row.created_at,
  };
}

function mapDbHkTask(row: Record<string, any>): HousekeepingTaskFull {
  return {
    id: row.id, roomNumber: row.room_number, floor: row.floor,
    taskType: row.task_type, status: row.status, priority: row.priority,
    assignedTo: row.assigned_to, assignedToName: row.assigned_to_name,
    notes: row.notes, startedAt: row.started_at, completedAt: row.completed_at,
    inspectedBy: row.inspected_by, inspectedAt: row.inspected_at,
    durationMinutes: row.duration_minutes, issuesFound: row.issues_found,
    createdAt: row.created_at,
  };
}

function mapDbMenuItem(row: Record<string, any>): BarMenuItem {
  return {
    id: row.id, name: row.name, category: row.category,
    price: Number(row.price), isAvailable: row.is_available,
    imageUrl: row.image_url, sortOrder: row.sort_order,
  };
}

function mapDbBarOrder(row: Record<string, any>): BarOrder {
  return {
    id: row.id, roomNumber: row.room_number, tableNumber: row.table_number,
    guestName: row.guest_name, orderType: row.order_type, status: row.status,
    items: row.items || [], totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method, notes: row.notes,
    createdBy: row.created_by, createdByName: row.created_by_name,
    deliveredAt: row.delivered_at, createdAt: row.created_at,
  };
}

function mapDbMaintenance(row: Record<string, any>): MaintenanceOrder {
  return {
    id: row.id, title: row.title, description: row.description,
    category: row.category, location: row.location, roomNumber: row.room_number,
    priority: row.priority, status: row.status,
    assignedTo: row.assigned_to, assignedToName: row.assigned_to_name,
    reportedBy: row.reported_by, notes: row.notes,
    estimatedMinutes: row.estimated_minutes,
    startedAt: row.started_at, completedAt: row.completed_at,
    partsUsed: row.parts_used, cost: row.cost ? Number(row.cost) : undefined,
    photos: row.photos || [], createdAt: row.created_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Default localStorage fallback data
// ═══════════════════════════════════════════════════════════════════
const defaultStaff: Staff[] = [
  { id: "s1", name: "Ayşe Demir", role: "housekeeping", pin: "1234", phone: "+90 532 111 0001", isActive: true, floorAssigned: 1, createdAt: new Date().toISOString() },
  { id: "s2", name: "Fatma Yılmaz", role: "housekeeping", pin: "1235", phone: "+90 532 111 0002", isActive: true, floorAssigned: 2, createdAt: new Date().toISOString() },
  { id: "s3", name: "Zeynep Kaya", role: "housekeeping", pin: "1236", phone: "+90 532 111 0003", isActive: true, floorAssigned: 3, createdAt: new Date().toISOString() },
  { id: "s4", name: "Mehmet Öz", role: "bar", pin: "2234", phone: "+90 532 222 0001", isActive: true, createdAt: new Date().toISOString() },
  { id: "s5", name: "Ali Çelik", role: "bar", pin: "2235", phone: "+90 532 222 0002", isActive: true, createdAt: new Date().toISOString() },
  { id: "s6", name: "Hasan Arslan", role: "maintenance", pin: "3234", phone: "+90 532 333 0001", isActive: true, createdAt: new Date().toISOString() },
  { id: "s7", name: "Osman Koç", role: "maintenance", pin: "3235", phone: "+90 532 333 0002", isActive: true, createdAt: new Date().toISOString() },
];

const defaultBarMenu: BarMenuItem[] = [
  { id: "bm1", name: "Türk Kahvesi", category: "sicak-icecek", price: 45, isAvailable: true, sortOrder: 1 },
  { id: "bm2", name: "Latte", category: "sicak-icecek", price: 65, isAvailable: true, sortOrder: 2 },
  { id: "bm3", name: "Çay", category: "sicak-icecek", price: 25, isAvailable: true, sortOrder: 4 },
  { id: "bm4", name: "Portakal Suyu", category: "soguk-icecek", price: 50, isAvailable: true, sortOrder: 10 },
  { id: "bm5", name: "Kola", category: "soguk-icecek", price: 35, isAvailable: true, sortOrder: 12 },
  { id: "bm6", name: "Bira (Efes)", category: "alkol", price: 85, isAvailable: true, sortOrder: 20 },
  { id: "bm7", name: "Club Sandwich", category: "yemek", price: 120, isAvailable: true, sortOrder: 40 },
  { id: "bm8", name: "Burger", category: "yemek", price: 140, isAvailable: true, sortOrder: 42 },
  { id: "bm9", name: "Karışık Kuruyemiş", category: "atistirmalik", price: 75, isAvailable: true, sortOrder: 30 },
  { id: "bm10", name: "Cheesecake", category: "tatli", price: 90, isAvailable: true, sortOrder: 50 },
];
