import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialized client — build sırasında env var olmayabilir
let _db: SupabaseClient | null = null;
function getDb(): SupabaseClient {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env vars not configured");
    _db = createClient(url, key);
  }
  return _db;
}
const db = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Type Definitions ──────────────────────────────────────────────────
export interface ChannelPartner {
  id: string;
  agency_id: string;
  name: string;
  status: "connected" | "disconnected" | "error" | "pending";
  credentials: Record<string, string>;
  settings: Record<string, unknown>;
  enabled: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  sync_direction: "inbound" | "outbound" | "both";
  webhook_url: string | null;
  webhook_secret: string | null;
  rate_mapping: Record<string, unknown>;
  commission_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelReservation {
  id: string;
  channel_partner_id: string;
  external_id: string;
  external_confirmation: string | null;
  reservation_id: string | null;
  raw_data: Record<string, unknown>;
  guest_name: string | null;
  room_type: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  commission: number;
  net_amount: number;
  currency: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  sync_status: "pending" | "syncing" | "completed" | "failed" | "conflict";
  synced_at: string | null;
  last_modified_at: string | null;
  created_at: string;
  updated_at: string;
  channel_partners?: { agency_id: string; name: string; commission_rate: number };
}

export interface SyncLog {
  id: string;
  channel_partner_id: string;
  direction: "inbound" | "outbound" | "both";
  action: string;
  status: "pending" | "syncing" | "completed" | "failed" | "conflict";
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  error_message: string | null;
  external_id: string | null;
  reservation_id: string | null;
  duration_ms: number | null;
  created_at: string;
  channel_partners?: { agency_id: string; name: string };
}

export interface RatePlan {
  id: string;
  channel_partner_id: string;
  room_type_id: string;
  external_room_code: string | null;
  rate_per_night: number;
  min_stay: number;
  max_stay: number;
  closed: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Channel Partner CRUD ──────────────────────────────────────────────
export async function getChannelPartners() {
  const { data, error } = await db
    .from("channel_partners")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as ChannelPartner[];
}

export async function getChannelPartnerByAgencyId(agencyId: string) {
  const { data, error } = await db
    .from("channel_partners")
    .select("*")
    .eq("agency_id", agencyId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data as ChannelPartner | null;
}

export async function upsertChannelPartner(
  agencyId: string,
  name: string,
  credentials: Record<string, string>,
  commissionRate?: number
) {
  const existing = await getChannelPartnerByAgencyId(agencyId);

  if (existing) {
    const { data, error } = await db
      .from("channel_partners")
      .update({
        credentials,
        commission_rate: commissionRate ?? existing.commission_rate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as ChannelPartner;
  }

  const insert = {
    agency_id: agencyId,
    name,
    credentials,
    status: "pending" as const,
    commission_rate: commissionRate ?? 0,
  };
  const { data, error } = await db
    .from("channel_partners")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data as ChannelPartner;
}

export async function updatePartnerStatus(
  partnerId: string,
  status: ChannelPartner["status"],
  extra?: Partial<ChannelPartner>
) {
  const update = { status, ...extra };
  const { data, error } = await db
    .from("channel_partners")
    .update(update)
    .eq("id", partnerId)
    .select()
    .single();
  if (error) throw error;
  return data as ChannelPartner;
}

export async function togglePartnerEnabled(partnerId: string, enabled: boolean) {
  const { data, error } = await db
    .from("channel_partners")
    .update({ enabled })
    .eq("id", partnerId)
    .select()
    .single();
  if (error) throw error;
  return data as ChannelPartner;
}

export async function deleteChannelPartner(partnerId: string) {
  const { error } = await db
    .from("channel_partners")
    .delete()
    .eq("id", partnerId);
  if (error) throw error;
}

// ─── Connection Testing ────────────────────────────────────────────────
export interface TestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export async function testChannelConnection(
  partner: ChannelPartner
): Promise<TestResult> {
  const start = Date.now();

  try {
    // Her ajans için farklı test endpointi kullanılır
    const testUrl = buildTestUrl(partner.agency_id, partner.credentials);
    const response = await fetch(testUrl, {
      method: "GET",
      headers: buildHeaders(partner.agency_id, partner.credentials),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const latencyMs = Date.now() - start;

    if (response.ok) {
      await updatePartnerStatus(partner.id, "connected", {
        last_tested_at: new Date().toISOString(),
      });

      await logSync(partner.id, "outbound", "connection_test", "completed", {
        duration_ms: latencyMs,
        response_data: { status: response.status },
      });

      return {
        success: true,
        message: `Bağlantı başarılı (${latencyMs}ms)`,
        latencyMs,
      };
    }

    const errorBody = await response.text().catch(() => "");
    await updatePartnerStatus(partner.id, "error", {
      last_tested_at: new Date().toISOString(),
    });

    await logSync(partner.id, "outbound", "connection_test", "failed", {
      duration_ms: latencyMs,
      error_message: `HTTP ${response.status}: ${errorBody.slice(0, 500)}`,
    });

    return {
      success: false,
      message: `HTTP ${response.status} hatası`,
      latencyMs,
      details: { status: response.status, body: errorBody.slice(0, 200) },
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";

    await updatePartnerStatus(partner.id, "error", {
      last_tested_at: new Date().toISOString(),
    });

    await logSync(partner.id, "outbound", "connection_test", "failed", {
      duration_ms: latencyMs,
      error_message: message,
    });

    return { success: false, message, latencyMs };
  }
}

// ─── Channel Reservation CRUD ──────────────────────────────────────────
export async function getChannelReservations(partnerId?: string) {
  let query = db
    .from("channel_reservations")
    .select("*, channel_partners(agency_id, name)")
    .order("created_at", { ascending: false });

  if (partnerId) {
    query = query.eq("channel_partner_id", partnerId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertChannelReservation(
  partnerId: string,
  externalId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await db
    .from("channel_reservations")
    .select("id")
    .eq("channel_partner_id", partnerId)
    .eq("external_id", externalId)
    .single();

  if (existing) {
    const { data, error } = await db
      .from("channel_reservations")
      .update({
        ...payload,
        last_modified_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as ChannelReservation, isNew: false };
  }

  const { data, error } = await db
    .from("channel_reservations")
    .insert({
      channel_partner_id: partnerId,
      external_id: externalId,
      ...payload,
    })
    .select()
    .single();
  if (error) throw error;
  return { data: data as ChannelReservation, isNew: true };
}

// ─── Sync to PMS ───────────────────────────────────────────────────────
export async function syncChannelReservationToPMS(channelResId: string) {
  const { data: channelRes, error: fetchErr } = await db
    .from("channel_reservations")
    .select("*, channel_partners(agency_id, name, commission_rate)")
    .eq("id", channelResId)
    .single();
  if (fetchErr || !channelRes) throw fetchErr || new Error("Kayıt bulunamadı");

  // Misafir oluştur veya bul
  const guestName = (channelRes.guest_name || "Bilinmeyen Misafir").split(" ");
  const firstName = guestName[0] || "Bilinmeyen";
  const lastName = guestName.slice(1).join(" ") || "Misafir";

  let guestId: string;
  const { data: existingGuest } = await db
    .from("guests")
    .select("id")
    .eq("first_name", firstName)
    .eq("last_name", lastName)
    .single();

  if (existingGuest) {
    guestId = existingGuest.id;
  } else {
    const { data: newGuest, error: guestErr } = await db
      .from("guests")
      .insert({ first_name: firstName, last_name: lastName })
      .select("id")
      .single();
    if (guestErr || !newGuest) throw guestErr || new Error("Misafir oluşturulamadı");
    guestId = newGuest.id;
  }

  // Oda tipi eşleştir
  const roomTypeCode = mapExternalRoomType(
    (channelRes.channel_partners as Record<string, unknown>)?.agency_id as string,
    channelRes.room_type || "standard"
  );
  const { data: roomType } = await db
    .from("room_types")
    .select("id")
    .eq("code", roomTypeCode)
    .single();

  const roomTypeId = roomType?.id;
  if (!roomTypeId) throw new Error(`Oda tipi bulunamadı: ${roomTypeCode}`);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(channelRes.check_out).getTime() -
        new Date(channelRes.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // PMS rezervasyonu oluştur
  const confNum = `CH-${channelRes.external_id.slice(-8).toUpperCase()}`;
  const { data: pmsRes, error: resErr } = await db
    .from("reservations")
    .insert({
      confirmation_number: confNum,
      guest_id: guestId,
      room_type_id: roomTypeId,
      check_in: channelRes.check_in,
      check_out: channelRes.check_out,
      nights,
      adults: channelRes.adults,
      children: channelRes.children,
      status: "confirmed",
      rate_per_night: channelRes.net_amount / nights,
      total_amount: channelRes.net_amount,
      balance: channelRes.net_amount,
      source: (channelRes.channel_partners as Record<string, unknown>)?.name as string || "Channel",
    })
    .select("id")
    .single();
  if (resErr || !pmsRes) throw resErr || new Error("PMS rezervasyonu oluşturulamadı");

  // Channel reservation'ı güncelle
  await db
    .from("channel_reservations")
    .update({
      reservation_id: pmsRes.id,
      sync_status: "completed",
      synced_at: new Date().toISOString(),
    })
    .eq("id", channelResId);

  // Log
  await logSync(channelRes.channel_partner_id, "inbound", "reservation_create", "completed", {
    external_id: channelRes.external_id,
    reservation_id: pmsRes.id,
  });

  return pmsRes.id;
}

// ─── Rate & Availability Push ──────────────────────────────────────────
export async function pushRatesAndAvailability(
  partnerId: string,
  roomTypeId: string,
  dates: { date: string; rate: number; available: number; closed: boolean }[]
) {
  const { data: partner } = await db
    .from("channel_partners")
    .select("*")
    .eq("id", partnerId)
    .single();
  if (!partner) throw new Error("Partner bulunamadı");

  const start = Date.now();

  try {
    const url = buildRateUpdateUrl(partner.agency_id, partner.credentials);
    const body = formatRatePayload(partner.agency_id, roomTypeId, dates);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildHeaders(partner.agency_id, partner.credentials),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const duration = Date.now() - start;
    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      await logSync(partnerId, "outbound", "rate_update", "completed", {
        duration_ms: duration,
        request_data: { roomTypeId, dateCount: dates.length },
        response_data: responseData as Record<string, unknown>,
      });
      return { success: true, message: `${dates.length} tarih güncellendi` };
    }

    await logSync(partnerId, "outbound", "rate_update", "failed", {
      duration_ms: duration,
      error_message: `HTTP ${response.status}`,
    });
    return { success: false, message: `HTTP ${response.status}` };
  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    await logSync(partnerId, "outbound", "rate_update", "failed", {
      duration_ms: duration,
      error_message: message,
    });
    return { success: false, message };
  }
}

// ─── Sync Logs ─────────────────────────────────────────────────────────
export async function getSyncLogs(partnerId?: string, limit = 50) {
  let query = db
    .from("channel_sync_logs")
    .select("*, channel_partners(agency_id, name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (partnerId) {
    query = query.eq("channel_partner_id", partnerId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function logSync(
  partnerId: string,
  direction: "inbound" | "outbound" | "both",
  action: string,
  status: "pending" | "syncing" | "completed" | "failed" | "conflict",
  extra?: {
    duration_ms?: number;
    error_message?: string;
    external_id?: string;
    reservation_id?: string;
    request_data?: Record<string, unknown>;
    response_data?: Record<string, unknown>;
  }
) {
  const insert = {
    channel_partner_id: partnerId,
    direction,
    action,
    status,
    duration_ms: extra?.duration_ms ?? null,
    error_message: extra?.error_message ?? null,
    external_id: extra?.external_id ?? null,
    reservation_id: extra?.reservation_id ?? null,
    request_data: extra?.request_data ?? {},
    response_data: extra?.response_data ?? {},
  };
  await db.from("channel_sync_logs").insert(insert);
}

// ─── Webhook Processing ────────────────────────────────────────────────
export interface WebhookPayload {
  event: "reservation_new" | "reservation_update" | "reservation_cancel";
  agencyId: string;
  externalId: string;
  data: {
    guestName?: string;
    roomType?: string;
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
    totalAmount?: number;
    currency?: string;
    status?: string;
  };
}

export async function processWebhook(payload: WebhookPayload) {
  const partner = await getChannelPartnerByAgencyId(payload.agencyId);
  if (!partner) throw new Error(`Partner bulunamadı: ${payload.agencyId}`);
  if (!partner.enabled) throw new Error(`Partner devre dışı: ${payload.agencyId}`);

  const commissionAmount =
    (payload.data.totalAmount || 0) * (Number(partner.commission_rate) / 100);
  const netAmount = (payload.data.totalAmount || 0) - commissionAmount;

  switch (payload.event) {
    case "reservation_new": {
      const { data: channelRes } = await upsertChannelReservation(
        partner.id,
        payload.externalId,
        {
          guest_name: payload.data.guestName,
          room_type: payload.data.roomType,
          check_in: payload.data.checkIn,
          check_out: payload.data.checkOut,
          adults: payload.data.adults ?? 1,
          children: payload.data.children ?? 0,
          total_amount: payload.data.totalAmount ?? 0,
          commission: commissionAmount,
          net_amount: netAmount,
          currency: payload.data.currency ?? "TRY",
          status: "confirmed",
          sync_status: "pending",
          raw_data: payload.data as unknown as Record<string, unknown>,
        }
      );

      // Otomatik PMS'e senkronize et
      const pmsResId = await syncChannelReservationToPMS(channelRes.id);

      await logSync(partner.id, "inbound", "reservation_create", "completed", {
        external_id: payload.externalId,
        reservation_id: pmsResId,
      });

      return { action: "created", channelResId: channelRes.id, pmsResId };
    }

    case "reservation_update": {
      const { data: channelRes } = await upsertChannelReservation(
        partner.id,
        payload.externalId,
        {
          guest_name: payload.data.guestName,
          room_type: payload.data.roomType,
          check_in: payload.data.checkIn,
          check_out: payload.data.checkOut,
          adults: payload.data.adults ?? 1,
          children: payload.data.children ?? 0,
          total_amount: payload.data.totalAmount ?? 0,
          commission: commissionAmount,
          net_amount: netAmount,
          currency: payload.data.currency ?? "TRY",
          sync_status: "pending",
          raw_data: payload.data as unknown as Record<string, unknown>,
        }
      );

      // Eğer PMS'de eşlenmiş rez varsa güncelle
      if (channelRes.reservation_id) {
        const nights = Math.max(
          1,
          Math.ceil(
            (new Date(payload.data.checkOut).getTime() -
              new Date(payload.data.checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        await db
          .from("reservations")
          .update({
            check_in: payload.data.checkIn,
            check_out: payload.data.checkOut,
            nights,
            adults: payload.data.adults,
            children: payload.data.children,
            total_amount: netAmount,
            balance: netAmount,
            rate_per_night: netAmount / nights,
          })
          .eq("id", channelRes.reservation_id);

        await db
          .from("channel_reservations")
          .update({ sync_status: "completed", synced_at: new Date().toISOString() })
          .eq("id", channelRes.id);
      }

      await logSync(partner.id, "inbound", "reservation_update", "completed", {
        external_id: payload.externalId,
        reservation_id: channelRes.reservation_id ?? undefined,
      });

      return { action: "updated", channelResId: channelRes.id };
    }

    case "reservation_cancel": {
      const { data: channelRes } = await db
        .from("channel_reservations")
        .select("id, reservation_id")
        .eq("channel_partner_id", partner.id)
        .eq("external_id", payload.externalId)
        .single();

      if (channelRes) {
        await db
          .from("channel_reservations")
          .update({ status: "cancelled", sync_status: "completed" })
          .eq("id", channelRes.id);

        if (channelRes.reservation_id) {
          await db
            .from("reservations")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("id", channelRes.reservation_id);
        }

        await logSync(partner.id, "inbound", "reservation_cancel", "completed", {
          external_id: payload.externalId,
          reservation_id: channelRes.reservation_id ?? undefined,
        });

        return { action: "cancelled", channelResId: channelRes.id };
      }

      throw new Error(`Rezervasyon bulunamadı: ${payload.externalId}`);
    }

    default:
      throw new Error(`Bilinmeyen event: ${payload.event}`);
  }
}

// ─── Realtime Subscriptions ────────────────────────────────────────────
export function subscribeToChannelReservations(
  callback: (payload: { new: ChannelReservation; old: ChannelReservation | null; eventType: string }) => void
) {
  return db
    .channel("channel_reservations_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "channel_reservations" },
      (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => {
        callback({
          new: payload.new as unknown as ChannelReservation,
          old: (payload.old as unknown as ChannelReservation) || null,
          eventType: payload.eventType,
        });
      }
    )
    .subscribe();
}

export function subscribeToSyncLogs(
  callback: (log: SyncLog) => void
) {
  return db
    .channel("sync_logs_changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "channel_sync_logs" },
      (payload: { new: Record<string, unknown> }) => callback(payload.new as unknown as SyncLog)
    )
    .subscribe();
}

// ─── Agency-Specific Helpers ───────────────────────────────────────────
function buildTestUrl(
  agencyId: string,
  credentials: Record<string, unknown>
): string {
  const creds = credentials as Record<string, string>;

  switch (agencyId) {
    case "booking":
      return `https://supply-xml.booking.com/hotels/xml/availability?hotel_id=${creds.hotelId}`;
    case "expedia":
      return `https://services.expediapartnercentral.com/properties/v1/${creds.propertyId}`;
    case "agoda":
      return `https://api.agoda.com/api/v1/hotel/${creds.hotelId}/status`;
    case "hotelbeds":
      return `https://api.hotelbeds.com/hotel-api/1.0/status`;
    case "etstur":
      return `https://api.etstur.com/v2/hotel/${creds.hotelCode}/ping`;
    case "jollytur":
      return `https://api.jollytur.com/v1/property/${creds.hotelId}/test`;
    default:
      // Genel test: ajansın websitesine HEAD isteği
      return `https://httpstat.us/200`;
  }
}

function buildHeaders(
  agencyId: string,
  credentials: Record<string, unknown>
): Record<string, string> {
  const creds = credentials as Record<string, string>;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  switch (agencyId) {
    case "booking":
      headers["Authorization"] = `Basic ${btoa(`${creds.hotelId}:${creds.apiKey}`)}`;
      break;
    case "expedia":
      headers["Authorization"] = `Bearer ${creds.apiKey}`;
      headers["X-API-Secret"] = creds.apiSecret || "";
      break;
    case "agoda":
    case "etstur":
    case "jollytur":
    case "tatilbudur":
    case "tatilsepeti":
    case "setur":
    case "odamax":
      headers["X-Api-Key"] = creds.apiKey || "";
      break;
    case "hotelbeds":
      headers["Api-key"] = creds.apiKey || "";
      headers["X-Signature"] = creds.secretKey || "";
      break;
    case "tourvisio":
      headers["Authorization"] = `Bearer ${creds.apiKey}`;
      headers["X-Agency-Code"] = creds.agencyCode || "";
      break;
    default:
      if (creds.apiKey) headers["X-Api-Key"] = creds.apiKey;
      break;
  }

  return headers;
}

function buildRateUpdateUrl(
  agencyId: string,
  credentials: Record<string, unknown>
): string {
  const creds = credentials as Record<string, string>;

  switch (agencyId) {
    case "booking":
      return `https://supply-xml.booking.com/hotels/xml/rateUpdate`;
    case "expedia":
      return `https://services.expediapartnercentral.com/properties/v1/${creds.propertyId}/rates`;
    case "etstur":
      return `https://api.etstur.com/v2/hotel/${creds.hotelCode}/rates`;
    default:
      return `https://api.${agencyId}.com/v1/rates`;
  }
}

function formatRatePayload(
  agencyId: string,
  roomTypeId: string,
  dates: { date: string; rate: number; available: number; closed: boolean }[]
): Record<string, unknown> {
  // Her ajans kendi formatını bekler — burada genel bir payload oluşturuyoruz
  // Gerçek entegrasyonda ajansa özel XML/JSON formatları kullanılır
  switch (agencyId) {
    case "booking":
      return {
        hotel_id: roomTypeId,
        rooms: dates.map((d) => ({
          date: d.date,
          rate: d.rate,
          availability: d.available,
          closed: d.closed ? 1 : 0,
        })),
      };
    case "expedia":
      return {
        roomType: roomTypeId,
        rateUpdates: dates.map((d) => ({
          startDate: d.date,
          endDate: d.date,
          ratePerNight: d.rate,
          totalInventoryAvailable: d.available,
          closedToArrival: d.closed,
        })),
      };
    default:
      return {
        roomTypeId,
        dates: dates.map((d) => ({
          date: d.date,
          price: d.rate,
          allotment: d.available,
          stopSale: d.closed,
        })),
      };
  }
}

function mapExternalRoomType(agencyId: string, externalType: string): string {
  // Ajans oda tip kodlarını PMS'deki oda tipi kodlarına eşle
  // İleride bu mapping channel_partners.rate_mapping'den okunacak
  const normalized = externalType.toLowerCase();

  if (normalized.includes("suite") || normalized.includes("süit")) return "suite";
  if (normalized.includes("deluxe") || normalized.includes("lüks")) return "deluxe";
  if (normalized.includes("family") || normalized.includes("aile")) return "family";
  if (normalized.includes("superior")) return "superior";
  return "standard";
}
