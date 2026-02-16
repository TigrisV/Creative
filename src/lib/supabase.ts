import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _supabase: SupabaseClient<Database> | null = null;

function initSupabase(): SupabaseClient<Database> | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("BURAYA") || key.includes("BURAYA")) return null;
  _supabase = createClient<Database>(url, key);
  return _supabase;
}

// Lazy proxy: build sırasında crash etmez, runtime'da null dönebilir
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = initSupabase();
    if (!client) throw new Error("Supabase yapılandırılmamış. .env.local dosyasını kontrol edin.");
    return (client as any)[prop];
  },
});

export function getSupabaseClient(): SupabaseClient<Database> | null {
  return initSupabase();
}
