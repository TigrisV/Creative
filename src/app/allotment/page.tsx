"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { getRoomsWithGuests } from "@/lib/data-service";
import type { Room, RoomType } from "@/lib/types";
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  CalendarRange,
  BedDouble,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  BarChart3,
  Info,
  Save,
  X,
  Lock,
  Unlock,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────
interface AllotmentRule {
  id: string;
  agencyId: string;
  agencyName: string;
  roomType: RoomType | "all";
  quota: number;
  used: number;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "expired";
  minStay: number;
  releaseDay: number; // kaç gün önce serbest bırakılır
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const STORAGE_KEY = "creative_allotments";

const roomTypeLabels: Record<string, string> = {
  all: "Tüm Odalar",
  standard: "Standard",
  deluxe: "Deluxe",
  suite: "Suite",
  family: "Family",
  king: "King",
  twin: "Twin",
};

const roomTypeColors: Record<string, string> = {
  all: "bg-slate-100 text-slate-700",
  standard: "bg-blue-100 text-blue-700",
  deluxe: "bg-purple-100 text-purple-700",
  suite: "bg-amber-100 text-amber-700",
  family: "bg-emerald-100 text-emerald-700",
  king: "bg-rose-100 text-rose-700",
  twin: "bg-cyan-100 text-cyan-700",
};

interface AgencyOption {
  id: string;
  name: string;
  logo: string;
  color: string;
  bgColor: string;
}

const agencyOptions: AgencyOption[] = [
  { id: "booking", name: "Booking.com", logo: "B", color: "text-blue-700", bgColor: "bg-blue-100" },
  { id: "expedia", name: "Expedia", logo: "E", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  { id: "airbnb", name: "Airbnb", logo: "A", color: "text-rose-600", bgColor: "bg-rose-100" },
  { id: "agoda", name: "Agoda", logo: "AG", color: "text-red-700", bgColor: "bg-red-100" },
  { id: "hotelbeds", name: "HotelBeds", logo: "HB", color: "text-orange-700", bgColor: "bg-orange-100" },
  { id: "trivago", name: "Trivago", logo: "T", color: "text-blue-600", bgColor: "bg-sky-100" },
  { id: "google-hotel", name: "Google Hotel Ads", logo: "G", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  { id: "hrs", name: "HRS", logo: "H", color: "text-violet-700", bgColor: "bg-violet-100" },
  { id: "etstur", name: "ETS Tur", logo: "ETS", color: "text-blue-800", bgColor: "bg-blue-50" },
  { id: "jollytur", name: "Jolly Tur", logo: "JT", color: "text-orange-700", bgColor: "bg-orange-50" },
  { id: "tatilbudur", name: "Tatilbudur", logo: "TB", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  { id: "tatilsepeti", name: "Tatil Sepeti", logo: "TS", color: "text-pink-700", bgColor: "bg-pink-50" },
  { id: "setur", name: "Setur", logo: "SE", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  { id: "odamax", name: "Odamax", logo: "OX", color: "text-amber-700", bgColor: "bg-amber-50" },
  { id: "tui", name: "TUI Türkiye", logo: "TUI", color: "text-red-600", bgColor: "bg-red-50" },
  { id: "coral", name: "Coral Travel", logo: "CT", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  { id: "anextour", name: "Anex Tour", logo: "AX", color: "text-red-600", bgColor: "bg-red-50" },
  { id: "pegas", name: "Pegas Touristik", logo: "PG", color: "text-yellow-700", bgColor: "bg-yellow-50" },
  { id: "otelz", name: "Otelz.com", logo: "OZ", color: "text-rose-700", bgColor: "bg-rose-50" },
  { id: "gezinomi", name: "Gezinomi", logo: "GZ", color: "text-purple-700", bgColor: "bg-purple-50" },
];

// ─── Storage ────────────────────────────────────────────────────────────
function loadAllotments(): AllotmentRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAllotments(rules: AllotmentRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// ─── Page ───────────────────────────────────────────────────────────────
export default function AllotmentPage() {
  const [mounted, setMounted] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allotments, setAllotments] = useState<AllotmentRule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editRule, setEditRule] = useState<AllotmentRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterAgency, setFilterAgency] = useState<string>("all");
  const [filterRoomType, setFilterRoomType] = useState<string>("all");

  // Form state
  const [form, setForm] = useState({
    agencyId: "",
    roomType: "all" as RoomType | "all",
    quota: 5,
    startDate: "",
    endDate: "",
    minStay: 1,
    releaseDay: 3,
  });

  useEffect(() => {
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
    setAllotments(loadAllotments());
    setMounted(true);
  }, []);

  const persist = useCallback((updated: AllotmentRule[]) => {
    setAllotments(updated);
    saveAllotments(updated);
  }, []);

  // Room counts per type
  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRooms.length };
    allRooms.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [allRooms]);

  // Today for date comparisons
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Auto-expire old allotments
  useEffect(() => {
    if (!mounted || allotments.length === 0) return;
    let changed = false;
    const updated = allotments.map((r) => {
      if (r.status === "active" && r.endDate < today) {
        changed = true;
        return { ...r, status: "expired" as const };
      }
      return r;
    });
    if (changed) persist(updated);
  }, [mounted, allotments, today, persist]);

  // Stats
  const activeRules = allotments.filter((r) => r.status === "active");
  const totalQuota = activeRules.reduce((s, r) => s + r.quota, 0);
  const totalUsed = activeRules.reduce((s, r) => s + r.used, 0);
  const uniqueAgencies = new Set(activeRules.map((r) => r.agencyId)).size;

  // Filtered allotments
  const filtered = allotments.filter((r) => {
    if (filterAgency !== "all" && r.agencyId !== filterAgency) return false;
    if (filterRoomType !== "all" && r.roomType !== filterRoomType) return false;
    return true;
  });

  // Group by agency
  const groupedByAgency = useMemo(() => {
    const map = new Map<string, AllotmentRule[]>();
    filtered.forEach((r) => {
      const group = map.get(r.agencyId) || [];
      group.push(r);
      map.set(r.agencyId, group);
    });
    return map;
  }, [filtered]);

  // Helpers
  const getAgency = (id: string) => agencyOptions.find((a) => a.id === id);

  const resetForm = () => {
    setForm({
      agencyId: "",
      roomType: "all",
      quota: 5,
      startDate: "",
      endDate: "",
      minStay: 1,
      releaseDay: 3,
    });
  };

  const openAdd = () => {
    resetForm();
    setEditRule(null);
    setShowAdd(true);
  };

  const openEdit = (rule: AllotmentRule) => {
    setForm({
      agencyId: rule.agencyId,
      roomType: rule.roomType,
      quota: rule.quota,
      startDate: rule.startDate,
      endDate: rule.endDate,
      minStay: rule.minStay,
      releaseDay: rule.releaseDay,
    });
    setEditRule(rule);
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!form.agencyId || !form.startDate || !form.endDate || form.quota < 1) return;
    const agency = getAgency(form.agencyId);
    if (!agency) return;

    // Check if quota exceeds total rooms of that type
    const maxRooms = form.roomType === "all" ? allRooms.length : (roomCounts[form.roomType] || 0);
    if (form.quota > maxRooms) {
      alert(`Bu oda tipinde toplam ${maxRooms} oda var. Kota ${maxRooms}'i geçemez.`);
      return;
    }

    if (editRule) {
      // Update existing
      const updated = allotments.map((r) =>
        r.id === editRule.id
          ? {
              ...r,
              agencyId: form.agencyId,
              agencyName: agency.name,
              roomType: form.roomType,
              quota: form.quota,
              startDate: form.startDate,
              endDate: form.endDate,
              minStay: form.minStay,
              releaseDay: form.releaseDay,
              status: form.endDate < today ? ("expired" as const) : r.status,
            }
          : r
      );
      persist(updated);
    } else {
      // Create new
      const newRule: AllotmentRule = {
        id: `allot-${Date.now()}`,
        agencyId: form.agencyId,
        agencyName: agency.name,
        roomType: form.roomType,
        quota: form.quota,
        used: 0,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.endDate < today ? "expired" : "active",
        minStay: form.minStay,
        releaseDay: form.releaseDay,
        createdAt: new Date().toISOString(),
      };
      persist([newRule, ...allotments]);
    }
    setShowAdd(false);
    setEditRule(null);
  };

  const handleDelete = (id: string) => {
    persist(allotments.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  };

  const toggleStatus = (id: string) => {
    const updated = allotments.map((r) => {
      if (r.id !== id) return r;
      if (r.status === "active") return { ...r, status: "paused" as const };
      if (r.status === "paused") return { ...r, status: "active" as const };
      return r;
    });
    persist(updated);
  };

  const handleUsedChange = (id: string, val: number) => {
    const updated = allotments.map((r) =>
      r.id === id ? { ...r, used: Math.max(0, Math.min(val, r.quota)) } : r
    );
    persist(updated);
  };

  const duplicateRule = (rule: AllotmentRule) => {
    const dup: AllotmentRule = {
      ...rule,
      id: `allot-${Date.now()}`,
      used: 0,
      createdAt: new Date().toISOString(),
    };
    persist([dup, ...allotments]);
  };

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oda Kotası (Allotment)</h1>
          <p className="text-[13px] text-muted-foreground">Ajanslara oda kotası tahsis edin</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oda Kotası (Allotment)</h1>
          <p className="text-[13px] text-muted-foreground">
            Ajanslara oda tipine ve tarihe göre kota tanımlayın
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" /> Yeni Kota Ekle
        </Button>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueAgencies}</p>
              <p className="text-[11px] text-muted-foreground">Kotalı Ajans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalQuota}</p>
              <p className="text-[11px] text-muted-foreground">Toplam Kota</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsed} / {totalQuota}</p>
              <p className="text-[11px] text-muted-foreground">Kullanılan</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRules.length}</p>
              <p className="text-[11px] text-muted-foreground">Aktif Kural</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Room Type Summary ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-blue-500" /> Oda Tipi Bazlı Özet
          </CardTitle>
          <CardDescription className="text-[12px]">
            Her oda tipindeki toplam oda sayısı ve tahsis edilen kota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(["standard", "deluxe", "suite", "family", "king", "twin"] as RoomType[]).map((rt) => {
              const count = roomCounts[rt] || 0;
              const quotaForType = activeRules
                .filter((r) => r.roomType === rt || r.roomType === "all")
                .reduce((s, r) => s + r.quota, 0);
              const usedForType = activeRules
                .filter((r) => r.roomType === rt || r.roomType === "all")
                .reduce((s, r) => s + r.used, 0);
              const pct = quotaForType > 0 ? Math.round((quotaForType / Math.max(count, 1)) * 100) : 0;
              return (
                <div key={rt} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-[10px] px-2", roomTypeColors[rt])}>
                      {roomTypeLabels[rt]}
                    </Badge>
                    <span className="text-[11px] font-bold">{count} oda</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Kota: {quotaForType}</span>
                      <span>Kullanılan: {usedForType}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-right text-muted-foreground">%{pct} tahsisli</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Filters ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterAgency} onValueChange={setFilterAgency}>
          <SelectTrigger className="w-[200px] h-9 text-[12px]">
            <SelectValue placeholder="Ajans Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ajanslar</SelectItem>
            {agencyOptions.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.logo} — {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRoomType} onValueChange={setFilterRoomType}>
          <SelectTrigger className="w-[180px] h-9 text-[12px]">
            <SelectValue placeholder="Oda Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Oda Tipleri</SelectItem>
            {(["standard", "deluxe", "suite", "family", "king", "twin"] as RoomType[]).map((rt) => (
              <SelectItem key={rt} value={rt}>{roomTypeLabels[rt]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[11px] px-3 py-1.5">
          {filtered.length} kural gösteriliyor
        </Badge>
      </div>

      {/* ═══ Allotment Rules ═══ */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-[14px] font-semibold text-muted-foreground">Henüz kota tanımlanmamış</h3>
            <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-sm">
              Ajanslara oda kotası tanımlayarak hangi ajansın kaç oda satabileceğini kontrol edebilirsiniz.
            </p>
            <Button size="sm" className="mt-4" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> İlk Kota Kuralını Ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedByAgency.entries()).map(([agencyId, rules]) => {
            const agency = getAgency(agencyId);
            if (!agency) return null;
            const agencyQuota = rules.filter((r) => r.status === "active").reduce((s, r) => s + r.quota, 0);
            const agencyUsed = rules.filter((r) => r.status === "active").reduce((s, r) => s + r.used, 0);
            return (
              <Card key={agencyId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-[12px] font-bold", agency.bgColor, agency.color)}>
                        {agency.logo}
                      </div>
                      <div>
                        <CardTitle className="text-[14px] font-semibold">{agency.name}</CardTitle>
                        <CardDescription className="text-[11px]">
                          {rules.length} kural · Toplam {agencyQuota} oda · {agencyUsed} kullanılan
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            agencyQuota > 0 && agencyUsed / agencyQuota > 0.8 ? "bg-rose-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${agencyQuota > 0 ? Math.min((agencyUsed / agencyQuota) * 100, 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        %{agencyQuota > 0 ? Math.round((agencyUsed / agencyQuota) * 100) : 0}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">Oda Tipi</th>
                          <th className="px-3 py-2 text-center font-medium">Kota</th>
                          <th className="px-3 py-2 text-center font-medium">Kullanılan</th>
                          <th className="px-3 py-2 text-center font-medium">Kalan</th>
                          <th className="px-3 py-2 text-left font-medium">Tarih Aralığı</th>
                          <th className="px-3 py-2 text-center font-medium">Min. Gece</th>
                          <th className="px-3 py-2 text-center font-medium">Release</th>
                          <th className="px-3 py-2 text-center font-medium">Durum</th>
                          <th className="px-3 py-2 text-right font-medium">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule) => {
                          const remaining = rule.quota - rule.used;
                          const pct = rule.quota > 0 ? Math.round((rule.used / rule.quota) * 100) : 0;
                          return (
                            <tr key={rule.id} className={cn("border-t transition-colors hover:bg-muted/30", rule.status === "expired" && "opacity-50")}>
                              <td className="px-3 py-2.5">
                                <Badge className={cn("text-[10px] px-2", roomTypeColors[rule.roomType])}>
                                  {roomTypeLabels[rule.roomType]}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold">{rule.quota}</td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={rule.quota}
                                    value={rule.used}
                                    onChange={(e) => handleUsedChange(rule.id, parseInt(e.target.value) || 0)}
                                    className="w-12 rounded border bg-background px-1.5 py-0.5 text-center text-[12px] font-medium"
                                    disabled={rule.status !== "active"}
                                  />
                                  <span className="text-[10px] text-muted-foreground">(%{pct})</span>
                                </div>
                              </td>
                              <td className={cn("px-3 py-2.5 text-center font-bold", remaining <= 2 ? "text-rose-600" : "text-emerald-600")}>
                                {remaining}
                              </td>
                              <td className="px-3 py-2.5 text-[11px]">
                                {formatDate(rule.startDate)} — {formatDate(rule.endDate)}
                              </td>
                              <td className="px-3 py-2.5 text-center">{rule.minStay} gece</td>
                              <td className="px-3 py-2.5 text-center">{rule.releaseDay} gün</td>
                              <td className="px-3 py-2.5 text-center">
                                {rule.status === "active" && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                                )}
                                {rule.status === "paused" && (
                                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Durduruldu</Badge>
                                )}
                                {rule.status === "expired" && (
                                  <Badge className="bg-gray-100 text-gray-500 text-[10px]">Süresi Doldu</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  {rule.status !== "expired" && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title={rule.status === "active" ? "Durdur" : "Aktifleştir"}
                                      onClick={() => toggleStatus(rule.id)}
                                    >
                                      {rule.status === "active" ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Unlock className="h-3.5 w-3.5 text-emerald-500" />}
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Düzenle" onClick={() => openEdit(rule)}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Kopyala" onClick={() => duplicateRule(rule)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Sil" onClick={() => setDeleteConfirm(rule.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Add / Edit Dialog ═══ */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditRule(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              {editRule ? "Kota Düzenle" : "Yeni Kota Ekle"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Ajansa tahsis edilecek oda kotasını belirleyin
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Agency */}
            <div>
              <label className="text-[12px] font-medium">Ajans *</label>
              <Select value={form.agencyId} onValueChange={(v) => setForm((p) => ({ ...p, agencyId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Ajans seçin" />
                </SelectTrigger>
                <SelectContent>
                  {agencyOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold", a.bgColor, a.color)}>{a.logo}</span>
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Type */}
            <div>
              <label className="text-[12px] font-medium">Oda Tipi</label>
              <Select value={form.roomType} onValueChange={(v) => setForm((p) => ({ ...p, roomType: v as RoomType | "all" }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roomTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Badge className={cn("text-[9px] px-1.5", roomTypeColors[key])}>{label}</Badge>
                        {key !== "all" && <span className="text-[11px] text-muted-foreground">({roomCounts[key] || 0} oda)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quota */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-medium">Kota *</label>
                <Input
                  type="number"
                  min={1}
                  max={form.roomType === "all" ? allRooms.length : (roomCounts[form.roomType] || 99)}
                  className="mt-1"
                  value={form.quota}
                  onChange={(e) => setForm((p) => ({ ...p, quota: parseInt(e.target.value) || 1 }))}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Max: {form.roomType === "all" ? allRooms.length : (roomCounts[form.roomType] || 0)}
                </p>
              </div>
              <div>
                <label className="text-[12px] font-medium">Min. Gece</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  className="mt-1"
                  value={form.minStay}
                  onChange={(e) => setForm((p) => ({ ...p, minStay: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">Release (gün)</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="mt-1"
                  value={form.releaseDay}
                  onChange={(e) => setForm((p) => ({ ...p, releaseDay: parseInt(e.target.value) || 0 }))}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">Giriş öncesi serbest bırakma</p>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium">Başlangıç *</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">Bitiş *</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
              <Info className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
              <div className="text-[11px] text-blue-700 space-y-0.5">
                <p><strong>Kota:</strong> Ajansın bu oda tipinden satabileceği maksimum oda.</p>
                <p><strong>Release:</strong> Check-in tarihinden kaç gün önce kullanılmayan kotalar serbest bırakılır.</p>
                <p><strong>Min. Gece:</strong> Bu kota üzerinden yapılacak minimum konaklama süresi.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setEditRule(null); }}>
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.agencyId || !form.startDate || !form.endDate || form.quota < 1}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {editRule ? "Güncelle" : "Kota Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm ═══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Kota Kuralını Sil
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Bu kota kuralı kalıcı olarak silinecektir. Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>İptal</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
