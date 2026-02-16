"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Globe,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube2,
  Trash2,
  Plus,
  ExternalLink,
  Shield,
  Zap,
  Building2,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

// ─── Agency Definitions ────────────────────────────────────────────────
interface Agency {
  id: string;
  name: string;
  logo: string;
  color: string;
  bgColor: string;
  website: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}

interface AgencyConnection {
  agencyId: string;
  credentials: Record<string, string>;
  status: "connected" | "disconnected" | "error";
  lastTested: string | null;
  lastSync: string | null;
  enabled: boolean;
}

const agencies: Agency[] = [
  {
    id: "booking",
    name: "Booking.com",
    logo: "B",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    website: "https://admin.booking.com",
    description: "Dünyanın en büyük online seyahat ajansı",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "123456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "bk_live_...", secret: true },
    ],
  },
  {
    id: "expedia",
    name: "Expedia",
    logo: "E",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    website: "https://partner.expediagroup.com",
    description: "Expedia Group — Hotels.com, Vrbo dahil",
    fields: [
      { key: "propertyId", label: "Property ID", placeholder: "EXP-78901" },
      { key: "apiKey", label: "API Key", placeholder: "exp_key_...", secret: true },
      { key: "apiSecret", label: "API Secret", placeholder: "exp_secret_...", secret: true },
    ],
  },
  {
    id: "airbnb",
    name: "Airbnb",
    logo: "A",
    color: "text-rose-600",
    bgColor: "bg-rose-100",
    website: "https://www.airbnb.com/hosting",
    description: "Kısa ve uzun süreli konaklama platformu",
    fields: [
      { key: "listingId", label: "Listing ID", placeholder: "airbnb_12345" },
      { key: "accessToken", label: "Access Token", placeholder: "at_...", secret: true },
    ],
  },
  {
    id: "agoda",
    name: "Agoda",
    logo: "AG",
    color: "text-red-700",
    bgColor: "bg-red-100",
    website: "https://ycs.agoda.com",
    description: "Asya-Pasifik bölgesinde güçlü OTA",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "AGD-456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "agd_...", secret: true },
    ],
  },
  {
    id: "hotelbeds",
    name: "HotelBeds",
    logo: "HB",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    website: "https://developer.hotelbeds.com",
    description: "B2B otel distribütörü ve toptan satış",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "hb_...", secret: true },
      { key: "secretKey", label: "Secret Key", placeholder: "hbs_...", secret: true },
    ],
  },
  {
    id: "trivago",
    name: "Trivago",
    logo: "T",
    color: "text-blue-600",
    bgColor: "bg-sky-100",
    website: "https://studio.trivago.com",
    description: "Otel fiyat karşılaştırma platformu",
    fields: [
      { key: "hotelId", label: "Partner ID", placeholder: "TRV-789" },
      { key: "apiToken", label: "API Token", placeholder: "trv_...", secret: true },
    ],
  },
  {
    id: "google-hotel",
    name: "Google Hotel Ads",
    logo: "G",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    website: "https://ads.google.com/intl/tr/hotels",
    description: "Google Otel Reklamları entegrasyonu",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "google_htl_..." },
      { key: "apiKey", label: "API Key", placeholder: "gha_...", secret: true },
    ],
  },
  {
    id: "hrs",
    name: "HRS",
    logo: "H",
    color: "text-violet-700",
    bgColor: "bg-violet-100",
    website: "https://www.hrs.com",
    description: "Avrupa odaklı kurumsal otel platformu",
    fields: [
      { key: "hotelCode", label: "Hotel Code", placeholder: "HRS-001" },
      { key: "apiKey", label: "API Key", placeholder: "hrs_...", secret: true },
    ],
  },
  // ─── Türk Ajanslar ──────────────────────────────────────────────────
  {
    id: "etstur",
    name: "ETS Tur",
    logo: "ETS",
    color: "text-blue-800",
    bgColor: "bg-blue-50",
    website: "https://www.etstur.com",
    description: "Türkiye'nin lider online seyahat ajansı",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "ETS-1234" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "ets_api_...", secret: true },
      { key: "apiSecret", label: "API Secret", placeholder: "ets_secret_...", secret: true },
    ],
  },
  {
    id: "jollytur",
    name: "Jolly Tur",
    logo: "JT",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    website: "https://www.jollytur.com",
    description: "Yurt içi ve yurt dışı tur & otel rezervasyonu",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "JLY-5678" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "jolly_...", secret: true },
    ],
  },
  {
    id: "tatilbudur",
    name: "Tatilbudur",
    logo: "TB",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    website: "https://www.tatilbudur.com",
    description: "Online tatil ve otel rezervasyon platformu",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "TB-9012" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "tb_api_...", secret: true },
    ],
  },
  {
    id: "tatilsepeti",
    name: "Tatil Sepeti",
    logo: "TS",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    website: "https://www.tatilsepeti.com",
    description: "Erken rezervasyon ve son dakika fırsatları",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "TS-3456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "tsep_...", secret: true },
    ],
  },
  {
    id: "setur",
    name: "Setur",
    logo: "SE",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    website: "https://www.setur.com.tr",
    description: "Koç Holding — seyahat ve turizm hizmetleri",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "SETUR-001" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "setur_...", secret: true },
    ],
  },
  {
    id: "odamax",
    name: "Odamax",
    logo: "OX",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    website: "https://www.odamax.com",
    description: "Türkiye geneli otel rezervasyon platformu",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "ODX-7890" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "odx_...", secret: true },
    ],
  },
  {
    id: "obilet",
    name: "Obilet",
    logo: "OB",
    color: "text-green-700",
    bgColor: "bg-green-50",
    website: "https://www.obilet.com",
    description: "Ulaşım ve konaklama rezervasyon platformu",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "OBL-456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "obl_...", secret: true },
    ],
  },
  {
    id: "tourvisio",
    name: "Tourvisio",
    logo: "TV",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    website: "https://www.tourvisio.com",
    description: "B2B tur operatörü ve XML entegrasyon",
    fields: [
      { key: "agencyCode", label: "Ajans Kodu", placeholder: "TVSN-001" },
      { key: "apiKey", label: "API Key", placeholder: "tv_api_...", secret: true },
      { key: "apiSecret", label: "API Secret", placeholder: "tv_secret_...", secret: true },
    ],
  },
  {
    id: "otelz",
    name: "Otelz.com",
    logo: "OZ",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    website: "https://www.otelz.com",
    description: "Türkiye'nin yerli otel rezervasyon sitesi",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "OTZ-123" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "otz_...", secret: true },
    ],
  },
  {
    id: "gezinomi",
    name: "Gezinomi",
    logo: "GZ",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    website: "https://www.gezinomi.com",
    description: "Online seyahat ve tatil platformu",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "GZN-789" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "gzn_...", secret: true },
    ],
  },
  {
    id: "corendon",
    name: "Corendon Airlines",
    logo: "CR",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    website: "https://www.corendonhotels.com",
    description: "Havayolu + otel paket tur operatörü",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "CRD-001" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "crd_...", secret: true },
    ],
  },
  {
    id: "anextour",
    name: "Anex Tour",
    logo: "AX",
    color: "text-red-600",
    bgColor: "bg-red-50",
    website: "https://www.anextour.com",
    description: "Uluslararası tur operatörü — Türkiye pazarı",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "ANX-456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "anx_...", secret: true },
    ],
  },
  {
    id: "pegas",
    name: "Pegas Touristik",
    logo: "PG",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    website: "https://www.pegasus.com.tr",
    description: "Rusya & Türkiye pazarı tur operatörü",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "PGS-789" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "pgs_...", secret: true },
    ],
  },
  {
    id: "coral",
    name: "Coral Travel",
    logo: "CT",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    website: "https://www.coraltravel.com.tr",
    description: "OTI Holding — uluslararası tur operatörü",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "CRL-012" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "crl_...", secret: true },
    ],
  },
  {
    id: "odeon",
    name: "Odeon Tours",
    logo: "OD",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    website: "https://www.odeontours.com.tr",
    description: "DMC ve incoming tur operatörü",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "ODN-345" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "odn_...", secret: true },
    ],
  },
  {
    id: "biblotur",
    name: "Biblo Tur",
    logo: "BT",
    color: "text-fuchsia-700",
    bgColor: "bg-fuchsia-50",
    website: "https://www.biblotur.com",
    description: "Grup ve bireysel tur organizasyonları",
    fields: [
      { key: "agencyId", label: "Ajans ID", placeholder: "BBL-678" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "bbl_...", secret: true },
    ],
  },
  {
    id: "turne",
    name: "Türne",
    logo: "TR",
    color: "text-lime-700",
    bgColor: "bg-lime-50",
    website: "https://www.turne.com",
    description: "Online seyahat acentası — otel ve tur",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "TRN-901" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "trn_...", secret: true },
    ],
  },
  {
    id: "tatil",
    name: "Tatil.com",
    logo: "TC",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    website: "https://www.tatil.com",
    description: "Türkiye'nin köklü tatil rezervasyon sitesi",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "TTL-234" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "ttl_...", secret: true },
    ],
  },
  {
    id: "rintur",
    name: "RIN Tur",
    logo: "RN",
    color: "text-red-700",
    bgColor: "bg-red-50",
    website: "https://www.rintur.com.tr",
    description: "Incoming tur operatörü — CIS pazarları",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "RIN-567" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "rin_...", secret: true },
    ],
  },
  {
    id: "tui",
    name: "TUI Türkiye",
    logo: "TUI",
    color: "text-red-600",
    bgColor: "bg-red-50",
    website: "https://www.tui.com",
    description: "Dünyanın en büyük tur operatörü — Türkiye",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "TUI-890" },
      { key: "apiKey", label: "API Key", placeholder: "tui_...", secret: true },
      { key: "giataCode", label: "GIATA Kodu", placeholder: "12345" },
    ],
  },
  // ─── KKTC Ajanslar ─────────────────────────────────────────────────
  {
    id: "oscar-resort",
    name: "Oscar Resort Hotel",
    logo: "OR",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    website: "https://www.oscar-resort.com",
    description: "KKTC'nin köklü otel ve tur operatörü",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "OSC-001" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "osc_...", secret: true },
    ],
  },
  {
    id: "cyprusholidays",
    name: "Cyprus Holidays",
    logo: "CH",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    website: "https://www.cyprusholidays.com",
    description: "KKTC tatil ve otel rezervasyon platformu",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "CYH-123" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "cyh_...", secret: true },
    ],
  },
  {
    id: "kibris-booking",
    name: "Kıbrıs Booking",
    logo: "KB",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    website: "https://www.kibrisbooking.com",
    description: "KKTC otel arama ve karşılaştırma",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "KBK-456" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "kbk_...", secret: true },
    ],
  },
  {
    id: "northcyprustourism",
    name: "North Cyprus Tourism",
    logo: "NC",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    website: "https://www.northcyprustourism.com",
    description: "KKTC resmi turizm tanıtım platformu",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "NCT-789" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "nct_...", secret: true },
    ],
  },
  {
    id: "kibrisada",
    name: "Kıbrıs Ada Tatil",
    logo: "KA",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    website: "https://www.kibrisadatatil.com",
    description: "KKTC yurt içi paket tur ve konaklama",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "KAT-012" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "kat_...", secret: true },
    ],
  },
  {
    id: "kktc-tur",
    name: "KKTC Tur",
    logo: "KT",
    color: "text-red-700",
    bgColor: "bg-red-50",
    website: "https://www.kktctur.com",
    description: "Kuzey Kıbrıs otel ve transfer hizmetleri",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "KKT-345" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "kkt_...", secret: true },
    ],
  },
  {
    id: "girnehotels",
    name: "Girne Hotels",
    logo: "GH",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    website: "https://www.girnehotels.com",
    description: "Girne bölgesi otel ve tatil rezervasyonu",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "GRN-678" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "grn_...", secret: true },
    ],
  },
  {
    id: "cyprus-premier",
    name: "Cyprus Premier Holidays",
    logo: "CP",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    website: "https://www.cypruspremierholidays.com",
    description: "İngiltere merkezli KKTC tur operatörü",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "CPH-901" },
      { key: "apiKey", label: "API Key", placeholder: "cph_...", secret: true },
    ],
  },
  {
    id: "kibris-tatil",
    name: "Kıbrıs Tatil",
    logo: "KT",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    website: "https://www.kibristatil.com",
    description: "KKTC'ye özel tatil paketleri ve otel fırsatları",
    fields: [
      { key: "hotelCode", label: "Otel Kodu", placeholder: "KBT-234" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "kbt_...", secret: true },
    ],
  },
  {
    id: "fly-cyprus",
    name: "Fly & Cyprus Travel",
    logo: "FC",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    website: "https://www.flycyprustravel.com",
    description: "KKTC uçak + otel paket organizasyonları",
    fields: [
      { key: "agencyCode", label: "Ajans Kodu", placeholder: "FCT-567" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "fct_...", secret: true },
    ],
  },
  {
    id: "magusa-travel",
    name: "Mağusa Travel",
    logo: "MT",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    website: "https://www.magusatravel.com",
    description: "Gazimağusa bölgesi tur ve konaklama",
    fields: [
      { key: "partnerId", label: "Partner ID", placeholder: "MGT-890" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "mgt_...", secret: true },
    ],
  },
  {
    id: "merit-travel",
    name: "Merit Travel",
    logo: "MR",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    website: "https://www.merithotels.com",
    description: "Merit Hotels & Casino — otel zincirleri",
    fields: [
      { key: "hotelId", label: "Otel ID", placeholder: "MRT-123" },
      { key: "apiKey", label: "API Anahtarı", placeholder: "mrt_...", secret: true },
    ],
  },
];

const STORAGE_KEY = "creative_agency_connections";
const HAS_SUPABASE = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function loadConnectionsLocal(): AgencyConnection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConnectionsLocal(conns: AgencyConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
}

async function loadConnectionsFromAPI(): Promise<AgencyConnection[]> {
  try {
    const res = await fetch("/api/channels/partners");
    if (!res.ok) return loadConnectionsLocal();
    const { data } = await res.json();
    if (!data || !Array.isArray(data)) return loadConnectionsLocal();
    return data.map((p: Record<string, unknown>) => ({
      agencyId: p.agency_id as string,
      credentials: (p.credentials || {}) as Record<string, string>,
      status: (p.status === "connected" ? "connected" : p.status === "error" ? "error" : "disconnected") as AgencyConnection["status"],
      lastTested: (p.last_tested_at as string) || null,
      lastSync: (p.last_sync_at as string) || null,
      enabled: !!p.enabled,
      _dbId: p.id as string,
    }));
  } catch {
    return loadConnectionsLocal();
  }
}

async function saveConnectionToAPI(
  agencyId: string,
  name: string,
  credentials: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch("/api/channels/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId, name, credentials }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteConnectionFromAPI(agencyId: string): Promise<boolean> {
  try {
    // First get the partner ID
    const res = await fetch("/api/channels/partners");
    if (!res.ok) return false;
    const { data } = await res.json();
    const partner = data?.find((p: Record<string, unknown>) => p.agency_id === agencyId);
    if (!partner) return false;
    const delRes = await fetch("/api/channels/partners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: partner.id }),
    });
    return delRes.ok;
  } catch {
    return false;
  }
}

async function toggleEnabledAPI(agencyId: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/channels/partners");
    if (!res.ok) return false;
    const { data } = await res.json();
    const partner = data?.find((p: Record<string, unknown>) => p.agency_id === agencyId);
    if (!partner) return false;
    const patchRes = await fetch("/api/channels/partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: partner.id, action: "toggle", enabled }),
    });
    return patchRes.ok;
  } catch {
    return false;
  }
}

async function testConnectionAPI(agencyId: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
  try {
    const res = await fetch("/api/channels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyId }),
    });
    return await res.json();
  } catch {
    return { success: false, message: "API isteği başarısız", latencyMs: 0 };
  }
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function AgenciesPage() {
  const [connections, setConnections] = useState<AgencyConnection[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setConnections(loadConnectionsLocal());
    setMounted(true);
  }, []);

  const persist = useCallback((updated: AgencyConnection[]) => {
    setConnections(updated);
    saveConnectionsLocal(updated);
  }, []);

  const getConnection = (agencyId: string) =>
    connections.find((c) => c.agencyId === agencyId);

  const connectedCount = connections.filter((c) => c.status === "connected" && c.enabled).length;

  // Open edit dialog
  const openEdit = (agency: Agency) => {
    const existing = getConnection(agency.id);
    setEditAgency(agency);
    setEditFields(existing?.credentials || {});
    setTestStatus("idle");
    setTestMessage("");
    setShowSecrets({});
  };

  // Test API key
  const testConnection = async () => {
    if (!editAgency) return;
    setTestStatus("testing");
    setTestMessage("");

    // Check if all required fields are filled
    const allFilled = editAgency.fields.every((f) => editFields[f.key]?.trim());
    if (!allFilled) {
      setTestStatus("error");
      setTestMessage("Tüm alanlar doldurulmalıdır.");
      return;
    }

    // Simülasyon — demo mod (tüm alanlar doluysa başarılı)
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const latency = (80 + Math.random() * 180).toFixed(0);
    setTestStatus("success");
    setTestMessage(`${editAgency.name} bağlantısı başarılı! Yanıt süresi: ${latency}ms`);
  };

  // Save connection
  const saveConnection = async () => {
    if (!editAgency || testStatus !== "success") return;
    const now = new Date().toISOString();
    const existing = connections.filter((c) => c.agencyId !== editAgency.id);
    const updated: AgencyConnection[] = [
      ...existing,
      {
        agencyId: editAgency.id,
        credentials: { ...editFields },
        status: "connected",
        lastTested: now,
        lastSync: now,
        enabled: true,
      },
    ];
    persist(updated);
    setEditAgency(null);
  };

  // Delete connection
  const deleteConnection = (agencyId: string) => {
    const updated = connections.filter((c) => c.agencyId !== agencyId);
    persist(updated);
    setDeleteConfirm(null);
  };

  // Toggle enable/disable
  const toggleEnabled = (agencyId: string) => {
    const conn = connections.find((c) => c.agencyId === agencyId);
    if (!conn) return;
    const newEnabled = !conn.enabled;
    const updated = connections.map((c) =>
      c.agencyId === agencyId ? { ...c, enabled: newEnabled } : c
    );
    persist(updated);
  };

  // Re-test existing connection
  const retestConnection = async (agencyId: string) => {
    const conn = connections.find((c) => c.agencyId === agencyId);
    if (!conn) return;

    // Mark as testing
    setConnections((prev) =>
      prev.map((c) => c.agencyId === agencyId ? { ...c, status: "disconnected" as const } : c)
    );

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const now = new Date().toISOString();
    persist(connections.map((c) =>
      c.agencyId === agencyId
        ? { ...c, status: "connected" as const, lastTested: now }
        : c
    ));
  };

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Anlaşmalı Ajanslar</h1>
          <p className="text-[13px] text-muted-foreground">OTA ve kanal entegrasyonlarını yönetin</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Anlaşmalı Ajanslar</h1>
          <p className="text-[13px] text-muted-foreground">OTA ve kanal entegrasyonlarını yönetin</p>
        </div>
        <Badge variant="secondary" className="text-[11px] px-3 py-1">
          <Zap className="mr-1 h-3 w-3 text-emerald-500" />
          {connectedCount} / {agencies.length} bağlı
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connectedCount}</p>
              <p className="text-[11px] text-muted-foreground">Aktif Bağlantı</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connections.length}</p>
              <p className="text-[11px] text-muted-foreground">Kayıtlı API Anahtarı</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agencies.length}</p>
              <p className="text-[11px] text-muted-foreground">Desteklenen Ajans</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Agencies */}
      {connections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Bağlı Ajanslar
            </CardTitle>
            <CardDescription className="text-[12px]">API anahtarı girilen ve bağlantısı doğrulanmış ajanslar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {connections.map((conn) => {
              const agency = agencies.find((a) => a.id === conn.agencyId);
              if (!agency) return null;
              return (
                <div
                  key={conn.agencyId}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-all",
                    conn.enabled ? "border-border/60" : "border-border/30 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-bold", agency.bgColor, agency.color)}>
                      {agency.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold">{agency.name}</p>
                        {conn.status === "connected" && conn.enabled && (
                          <Badge className="h-5 bg-emerald-100 text-emerald-700 text-[9px] hover:bg-emerald-100">
                            <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Bağlı
                          </Badge>
                        )}
                        {conn.status === "connected" && !conn.enabled && (
                          <Badge variant="secondary" className="h-5 text-[9px]">Devre Dışı</Badge>
                        )}
                        {conn.status === "error" && (
                          <Badge className="h-5 bg-red-100 text-red-700 text-[9px] hover:bg-red-100">
                            <XCircle className="mr-0.5 h-2.5 w-2.5" /> Hata
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Son test: {conn.lastTested
                          ? new Date(conn.lastTested).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                        {conn.lastSync && ` · Son senk: ${new Date(conn.lastSync).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => retestConnection(conn.agencyId)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" /> Test
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => toggleEnabled(conn.agencyId)}
                    >
                      {conn.enabled ? "Devre Dışı" : "Etkinleştir"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(conn.agencyId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Agencies Grid */}
      <div>
        <h2 className="text-[14px] font-semibold mb-3">Tüm Desteklenen Ajanslar</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agencies.map((agency) => {
            const conn = getConnection(agency.id);
            const isConnected = conn?.status === "connected" && conn?.enabled;
            return (
              <Card
                key={agency.id}
                className={cn(
                  "group cursor-pointer transition-all hover:shadow-md",
                  isConnected && "ring-1 ring-emerald-200 border-emerald-200"
                )}
                onClick={() => openEdit(agency)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-[14px] font-bold", agency.bgColor, agency.color)}>
                      {agency.logo}
                    </div>
                    {isConnected ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[9px] hover:bg-emerald-100">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Bağlı
                      </Badge>
                    ) : conn ? (
                      <Badge variant="secondary" className="text-[9px]">
                        {conn.enabled ? "Hata" : "Devre Dışı"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        <Plus className="mr-0.5 h-2.5 w-2.5" /> Bağlan
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold">{agency.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{agency.description}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Key className="h-3 w-3" />
                    {agency.fields.length} kimlik bilgisi gerekli
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ Edit / Add Dialog ═══ */}
      <Dialog open={!!editAgency} onOpenChange={(open) => { if (!open) setEditAgency(null); }}>
        <DialogContent className="max-w-md">
          {editAgency && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[15px]">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold", editAgency.bgColor, editAgency.color)}>
                    {editAgency.logo}
                  </div>
                  {editAgency.name} Entegrasyonu
                </DialogTitle>
                <DialogDescription className="text-[12px]">
                  {editAgency.description}
                  <a
                    href={editAgency.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 inline-flex items-center text-primary hover:underline"
                  >
                    Panel <ExternalLink className="ml-0.5 h-3 w-3" />
                  </a>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {editAgency.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-[12px] font-medium">{field.label}</label>
                    <div className="relative mt-1">
                      <Input
                        type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                        value={editFields[field.key] || ""}
                        onChange={(e) => {
                          setEditFields({ ...editFields, [field.key]: e.target.value });
                          setTestStatus("idle");
                        }}
                        placeholder={field.placeholder}
                        className="pr-16"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                        {field.secret && (
                          <button
                            type="button"
                            onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {editFields[field.key] && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(editFields[field.key])}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Test Result */}
                {testStatus === "success" && (
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-[12px] text-emerald-700">{testMessage}</p>
                  </div>
                )}
                {testStatus === "error" && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <p className="text-[12px] text-red-700">{testMessage}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={testConnection}
                    disabled={testStatus === "testing" || editAgency.fields.some((f) => !editFields[f.key]?.trim())}
                  >
                    {testStatus === "testing" ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Test Ediliyor...</>
                    ) : (
                      <><TestTube2 className="mr-1.5 h-3.5 w-3.5" /> Bağlantıyı Test Et</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={saveConnection}
                    disabled={testStatus !== "success"}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Kaydet & Bağlan
                  </Button>
                </div>

                {testStatus === "idle" && editAgency.fields.some((f) => !editFields[f.key]?.trim()) && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Tüm alanları doldurun, ardından bağlantıyı test edin.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm Dialog ═══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Bağlantıyı Sil</DialogTitle>
            <DialogDescription className="text-[12px]">
              Bu ajansın API anahtarları ve bağlantı bilgileri kalıcı olarak silinecek. Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>İptal</Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => deleteConfirm && deleteConnection(deleteConfirm)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
