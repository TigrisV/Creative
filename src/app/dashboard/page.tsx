"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  LogIn,
  LogOut,
  Wallet,
  Loader2,
  Building2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getReservations, getRoomsWithGuests } from "@/lib/data-service";
import type { Reservation, Room } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";

const agencyDefs: Record<string, { name: string; logo: string; color: string; bgColor: string }> = {
  booking: { name: "Booking.com", logo: "B", color: "text-blue-700", bgColor: "bg-blue-100" },
  expedia: { name: "Expedia", logo: "E", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  airbnb: { name: "Airbnb", logo: "A", color: "text-rose-600", bgColor: "bg-rose-100" },
  agoda: { name: "Agoda", logo: "AG", color: "text-red-700", bgColor: "bg-red-100" },
  hotelbeds: { name: "HotelBeds", logo: "HB", color: "text-orange-700", bgColor: "bg-orange-100" },
  trivago: { name: "Trivago", logo: "T", color: "text-blue-600", bgColor: "bg-sky-100" },
  "google-hotel": { name: "Google Hotel Ads", logo: "G", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  hrs: { name: "HRS", logo: "H", color: "text-violet-700", bgColor: "bg-violet-100" },
  etstur: { name: "ETS Tur", logo: "ETS", color: "text-blue-800", bgColor: "bg-blue-50" },
  jollytur: { name: "Jolly Tur", logo: "JT", color: "text-orange-700", bgColor: "bg-orange-50" },
  tatilbudur: { name: "Tatilbudur", logo: "TB", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  tatilsepeti: { name: "Tatil Sepeti", logo: "TS", color: "text-pink-700", bgColor: "bg-pink-50" },
  setur: { name: "Setur", logo: "SE", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  odamax: { name: "Odamax", logo: "OX", color: "text-amber-700", bgColor: "bg-amber-50" },
  obilet: { name: "Obilet", logo: "OB", color: "text-green-700", bgColor: "bg-green-50" },
  tourvisio: { name: "Tourvisio", logo: "TV", color: "text-teal-700", bgColor: "bg-teal-50" },
  otelz: { name: "Otelz.com", logo: "OZ", color: "text-rose-700", bgColor: "bg-rose-50" },
  gezinomi: { name: "Gezinomi", logo: "GZ", color: "text-purple-700", bgColor: "bg-purple-50" },
  corendon: { name: "Corendon Airlines", logo: "CR", color: "text-sky-700", bgColor: "bg-sky-50" },
  anextour: { name: "Anex Tour", logo: "AX", color: "text-red-600", bgColor: "bg-red-50" },
  pegas: { name: "Pegas Touristik", logo: "PG", color: "text-yellow-700", bgColor: "bg-yellow-50" },
  coral: { name: "Coral Travel", logo: "CT", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  odeon: { name: "Odeon Tours", logo: "OD", color: "text-slate-700", bgColor: "bg-slate-100" },
  biblotur: { name: "Biblo Tur", logo: "BT", color: "text-fuchsia-700", bgColor: "bg-fuchsia-50" },
  turne: { name: "Türne", logo: "TR", color: "text-lime-700", bgColor: "bg-lime-50" },
  tatil: { name: "Tatil.com", logo: "TC", color: "text-blue-600", bgColor: "bg-blue-50" },
  rintur: { name: "RIN Tur", logo: "RN", color: "text-red-700", bgColor: "bg-red-50" },
  tui: { name: "TUI Türkiye", logo: "TUI", color: "text-red-600", bgColor: "bg-red-50" },
  "oscar-resort": { name: "Oscar Resort Hotel", logo: "OR", color: "text-amber-700", bgColor: "bg-amber-50" },
  cyprusholidays: { name: "Cyprus Holidays", logo: "CH", color: "text-sky-700", bgColor: "bg-sky-50" },
  "kibris-booking": { name: "Kıbrıs Booking", logo: "KB", color: "text-blue-700", bgColor: "bg-blue-50" },
  northcyprustourism: { name: "North Cyprus Tourism", logo: "NC", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  kibrisada: { name: "Kıbrıs Ada Tatil", logo: "KA", color: "text-orange-600", bgColor: "bg-orange-50" },
  "kktc-tur": { name: "KKTC Tur", logo: "KT", color: "text-red-700", bgColor: "bg-red-50" },
  girnehotels: { name: "Girne Hotels", logo: "GH", color: "text-teal-700", bgColor: "bg-teal-50" },
  "cyprus-premier": { name: "Cyprus Premier Holidays", logo: "CP", color: "text-violet-700", bgColor: "bg-violet-50" },
  "kibris-tatil": { name: "Kıbrıs Tatil", logo: "KT", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  "fly-cyprus": { name: "Fly & Cyprus Travel", logo: "FC", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  "magusa-travel": { name: "Mağusa Travel", logo: "MT", color: "text-rose-700", bgColor: "bg-rose-50" },
  "merit-travel": { name: "Merit Travel", logo: "MR", color: "text-yellow-700", bgColor: "bg-yellow-50" },
};

interface StoredConn {
  agencyId: string;
  status: string;
  enabled: boolean;
  lastSync: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  "vacant-clean": { color: "text-emerald-600", bg: "bg-emerald-500", label: "Boş / Temiz" },
  "vacant-dirty": { color: "text-amber-600", bg: "bg-amber-400", label: "Boş / Kirli" },
  occupied: { color: "text-blue-600", bg: "bg-blue-500", label: "Dolu" },
  "out-of-order": { color: "text-slate-500", bg: "bg-slate-400", label: "Arızalı" },
  maintenance: { color: "text-red-500", bg: "bg-red-400", label: "Bakımda" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [connectedAgencies, setConnectedAgencies] = useState<StoredConn[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  useEffect(() => {
    const td = new Date().toISOString().split("T")[0];
    setToday(td);
    // Load connected agencies from localStorage
    try {
      const raw = localStorage.getItem("creative_agency_connections");
      if (raw) {
        const all: StoredConn[] = JSON.parse(raw);
        setConnectedAgencies(all.filter((c) => c.status === "connected" && c.enabled));
      }
    } catch { /* ignore */ }
    // Load reservations & rooms from persistent storage
    getReservations().then(setAllReservations).catch(() => {});
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
    setMounted(true);
  }, []);

  const activeRes = allReservations.filter((r) => r.status !== "cancelled" && r.status !== "no-show");
  const todayArrivals = allReservations.filter(
    (r) => (r.status === "confirmed" || r.status === "pending") && r.checkIn === today
  );
  const todayDepartures = allReservations.filter(
    (r) => r.status === "checked-in" && r.checkOut === today
  );
  const inHouse = allReservations.filter((r) => r.status === "checked-in");

  // Dynamic KPIs
  const totalRooms = allRooms.length;
  const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
  const availableRooms = allRooms.filter((r) => r.status === "vacant-clean" || r.status === "vacant-dirty").length;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const todayRevenue = activeRes.filter((r) => r.checkIn === today).reduce((s, r) => s + r.totalAmount, 0);
  const monthStart = today ? today.slice(0, 7) : "";
  const monthlyRevenue = activeRes.filter((r) => r.checkIn.startsWith(monthStart)).reduce((s, r) => s + r.totalAmount, 0);

  // Dynamic weekly occupancy (last 7 days from reservations)
  const weeklyOccupancy = React.useMemo(() => {
    const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const result: { day: string; occupancy: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const dayInHouse = allReservations.filter((r) => r.checkIn <= ds && r.checkOut > ds && (r.status === "checked-in" || r.status === "confirmed")).length;
      const occ = totalRooms ? Math.round((dayInHouse / totalRooms) * 100) : 0;
      const rev = activeRes.filter((r) => r.checkIn === ds).reduce((s, r) => s + r.totalAmount, 0);
      result.push({ day: days[d.getDay()], occupancy: Math.min(occ, 100), revenue: rev });
    }
    return result;
  }, [allReservations, totalRooms, activeRes]);

  // Dynamic revenue by source
  const revenueBySource = React.useMemo(() => {
    const map: Record<string, number> = {};
    activeRes.forEach((r) => {
      const src = r.source || "Direkt";
      map[src] = (map[src] || 0) + r.totalAmount;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([source, amount]) => ({ source, amount, percentage: total ? Math.round((amount / total) * 100) : 0 }));
  }, [activeRes]);

  const roomStatusCounts = allRooms.reduce(
    (acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hoş geldiniz, Ahmet</h1>
          <p className="text-[13px] text-muted-foreground">Creative günlük operasyon özeti</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Hoş geldiniz, Ahmet</h1>
        <p className="text-[13px] text-muted-foreground">Creative günlük operasyon özeti</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Occupancy */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Doluluk</p>
                <p className="mt-1 text-2xl font-bold">%{occupancyRate}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{occupiedRooms}/{totalRooms} oda</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BedDouble className="h-5 w-5" />
              </div>
            </div>
            <Progress value={occupancyRate} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Bugünkü Gelir</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
                <div className="mt-0.5 flex items-center text-[11px] text-muted-foreground">
                  Aylık: {formatCurrency(monthlyRevenue)}
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-ins */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check-in</p>
                <p className="mt-1 text-2xl font-bold">{todayArrivals.length}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{todayArrivals.length} bekliyor &middot; {inHouse.length} konaklamada</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <LogIn className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-outs */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check-out</p>
                <p className="mt-1 text-2xl font-bold">{todayDepartures.length}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{todayDepartures.length} bekliyor &middot; {availableRooms} müsait</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <LogOut className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mid Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Room Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold">Oda Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(roomStatusCounts).map(([status, count]) => {
              const cfg = statusConfig[status] || { color: "text-gray-500", bg: "bg-gray-400", label: status };
              const pct = allRooms.length ? Math.round(((count as number) / allRooms.length) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={cn("h-2 w-2 rounded-full", cfg.bg)} />
                  <span className="flex-1 text-[13px]">{cfg.label}</span>
                  <span className="text-[13px] font-semibold">{count}</span>
                  <span className="w-10 text-right text-[11px] text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Weekly */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold">Haftalık Doluluk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weeklyOccupancy.map((day) => (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="w-7 text-[12px] font-medium text-muted-foreground">{day.day}</span>
                  <div className="flex-1">
                    <div className="h-5 overflow-hidden rounded bg-secondary/70">
                      <div
                        className="h-full rounded bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                        style={{ width: `${day.occupancy}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-[12px] font-semibold">%{day.occupancy}</span>
                  <span className="w-20 text-right text-[11px] text-muted-foreground">{formatCurrency(day.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Arrivals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold">Varışlar ({todayArrivals.length})</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => router.push("/front-desk")}>Tümü</Button>
          </CardHeader>
          <CardContent>
            {todayArrivals.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">Bugün beklenen varış yok</p>
            ) : (
              <div className="space-y-2">
                {todayArrivals.map((res) => (
                  <div key={res.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-600">
                        {res.guest.firstName[0]}{res.guest.lastName[0]}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{res.guest.firstName} {res.guest.lastName}</p>
                        <p className="text-[11px] text-muted-foreground">{res.roomType} &middot; {res.nights} gece</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => router.push("/front-desk")}>Check-in</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold">Ayrılışlar ({todayDepartures.length})</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => router.push("/front-desk")}>Tümü</Button>
          </CardHeader>
          <CardContent>
            {todayDepartures.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">Bugün ayrılacak misafir yok</p>
            ) : (
              <div className="space-y-2">
                {todayDepartures.map((res) => (
                  <div key={res.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[11px] font-bold text-orange-600">
                        {res.guest.firstName[0]}{res.guest.lastName[0]}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{res.guest.firstName} {res.guest.lastName}</p>
                        <p className="text-[11px] text-muted-foreground">Oda {res.room?.number || "—"} &middot; {formatCurrency(res.balance)} bakiye</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => router.push("/front-desk")}>Check-out</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Sources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold">Gelir Kaynakları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueBySource.map((source, i) => {
              const colors = ["bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-purple-500", "bg-slate-400"];
              return (
                <div key={source.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium">{source.source}</span>
                    <span className="text-muted-foreground">{formatCurrency(source.amount)} ({source.percentage}%)</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/70">
                    <div
                      className={cn("h-full rounded-full transition-all", colors[i % colors.length])}
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* In-House */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold">Konaklamada ({inHouse.length})</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-medium">{inHouse.length} misafir</Badge>
          </CardHeader>
          <CardContent>
            {inHouse.length === 0 ? (
              <p className="text-center text-[13px] text-muted-foreground py-6">Şu an konaklamada misafir yok</p>
            ) : (
              <div className="space-y-2">
                {inHouse.slice(0, 4).map((res) => (
                  <div key={res.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-600">
                        {res.guest?.firstName?.[0] || "?"}{res.guest?.lastName?.[0] || "?"}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{res.guest?.firstName} {res.guest?.lastName}</p>
                        <p className="text-[11px] text-muted-foreground">Oda {res.room?.number || "—"} &middot; Çıkış: {res.checkOut}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-medium">{formatCurrency(res.totalAmount)}</p>
                      {res.balance > 0 && (
                        <p className="text-[10px] text-destructive">{formatCurrency(res.balance)} bakiye</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connected Agencies */}
      {connectedAgencies.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Bağlı Ajanslar
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => router.push("/agencies")}>
              Yönet <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {connectedAgencies.map((conn) => {
                const def = agencyDefs[conn.agencyId];
                if (!def) return null;
                return (
                  <div key={conn.agencyId} className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold", def.bgColor, def.color)}>
                      {def.logo}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate">{def.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Bağlı
                        {conn.lastSync && (
                          <span className="text-muted-foreground ml-1">
                            · {new Date(conn.lastSync).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
