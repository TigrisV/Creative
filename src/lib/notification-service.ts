import { createClient } from "@supabase/supabase-js";

export interface PmsNotification {
  id: string;
  type: "housekeeping" | "checkin" | "checkout" | "payment" | "maintenance" | "alert";
  title: string;
  description: string;
  read: boolean;
  roomNumber?: string;
  createdAt: string;
}

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

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

const LS_KEY = "creative_notifications";

export async function getNotifications(): Promise<PmsNotification[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("pms_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []).map(mapDbNotif);
  }
  return lsGet<PmsNotification[]>(LS_KEY, []);
}

export async function createNotification(notif: Omit<PmsNotification, "id" | "createdAt" | "read">): Promise<PmsNotification> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (sb as any)
      .from("pms_notifications")
      .insert({
        type: notif.type,
        title: notif.title,
        description: notif.description,
        room_number: notif.roomNumber || null,
        read: false,
      })
      .select()
      .single();
    if (error) throw error;
    return mapDbNotif(data);
  }
  const all = lsGet<PmsNotification[]>(LS_KEY, []);
  const newNotif: PmsNotification = {
    ...notif, id: `notif-${Date.now()}`, read: false, createdAt: new Date().toISOString(),
  };
  all.unshift(newNotif);
  if (all.length > 50) all.length = 50;
  lsSet(LS_KEY, all);
  return newNotif;
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await (sb as any).from("pms_notifications").update({ read: true }).eq("id", id);
    return;
  }
  const all = lsGet<PmsNotification[]>(LS_KEY, []);
  const idx = all.findIndex((n) => n.id === id);
  if (idx >= 0) { all[idx].read = true; lsSet(LS_KEY, all); }
}

export async function markAllNotificationsRead(): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await (sb as any).from("pms_notifications").update({ read: true }).eq("read", false);
    return;
  }
  const all = lsGet<PmsNotification[]>(LS_KEY, []);
  all.forEach((n) => { n.read = true; });
  lsSet(LS_KEY, all);
}

function mapDbNotif(row: Record<string, any>): PmsNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    read: row.read,
    roomNumber: row.room_number,
    createdAt: row.created_at,
  };
}
