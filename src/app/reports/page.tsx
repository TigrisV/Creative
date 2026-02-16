"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReservations, getRoomsWithGuests } from "@/lib/data-service";
import type { Reservation, Room } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  BedDouble,
  Users,
  Calendar,
  Printer,
  Hotel,
  Globe,
  Coffee,
  XCircle,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  UserCheck,
  DollarSign,
  Utensils,
  AlertTriangle,
  TrendingDown,
  Percent,
  Clock,
  Star,
} from "lucide-react";

// ─── Labels ─────────────────────────────────────────────────────────────
const typeLabels: Record<string, string> = { standard: "Standart", deluxe: "Deluxe", suite: "Süit", family: "Aile", king: "King", twin: "Twin" };
const mealLabels: Record<string, string> = { RO: "Sadece Oda", BB: "Kahvaltı Dahil", HB: "Yarım Pansiyon", FB: "Tam Pansiyon", AI: "Her Şey Dahil" };
const statusLabels: Record<string, string> = { confirmed: "Onaylandı", "checked-in": "Giriş Yapıldı", "checked-out": "Çıkış Yapıldı", cancelled: "İptal", "no-show": "Gelmedi", pending: "Beklemede" };
const nationalityLabels: Record<string, string> = { TR: "Türkiye", US: "ABD", DE: "Almanya", RU: "Rusya", FR: "Fransa", GB: "İngiltere", NL: "Hollanda", IT: "İtalya", ES: "İspanya", SA: "Suudi Arabistan", AE: "BAE", JP: "Japonya", CN: "Çin", KR: "Güney Kore" };
const nationalityFlags: Record<string, string> = { TR: "🇹🇷", US: "🇺🇸", DE: "🇩🇪", RU: "🇷🇺", FR: "🇫🇷", GB: "🇬🇧", NL: "🇳🇱", IT: "🇮🇹", ES: "🇪🇸", SA: "🇸🇦", AE: "🇦🇪", JP: "🇯🇵", CN: "🇨🇳", KR: "🇰🇷" };

// ─── Helpers ────────────────────────────────────────────────────────────
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return d; } };
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ─── Print helper ───────────────────────────────────────────────────────
function printReport(title: string, subtitle: string, tableHtml: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,sans-serif;font-size:11px;padding:20px}
    h1{font-size:16px;margin-bottom:2px}.sub{font-size:11px;color:#666;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{border:1px solid #000;padding:4px 8px;text-align:left}
    th{background:#f0f0f0;font-weight:700}.r{text-align:right}.c{text-align:center}
    .section{margin-top:20px;font-size:13px;font-weight:700;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:8px}
    .footer{margin-top:16px;font-size:10px;color:#666;display:flex;justify-content:space-between}
    @media print{body{padding:10px}}</style>
  </head><body>
    <h1>Creative PMS — ${title}</h1>
    <div class="sub">${subtitle} · Tarih: ${today}</div>
    ${tableHtml}
    <div class="footer"><span>Creative PMS v1.0</span><span>${today}</span></div>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ─── Report Section Header ──────────────────────────────────────────────
function ReportHeader({ title, dateLabel, onPrint }: { title: string; dateLabel: string; onPrint: () => void }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        {dateLabel !== "Tüm Tarihler" && <p className="text-[11px] text-muted-foreground">{dateLabel}</p>}
      </div>
      <Button size="sm" onClick={onPrint} className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
        <Printer className="mr-1.5 h-4 w-4" />Yazdır
      </Button>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────
function KPI({ icon: Icon, label, value, sub, color = "blue" }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600", rose: "bg-rose-50 text-rose-600", slate: "bg-slate-100 text-slate-600" };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colors[color] || colors.blue)}><Icon className="h-4 w-4" /></div>
        <div><p className="text-xl font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p>{sub && <p className="text-[9px] text-muted-foreground/70">{sub}</p>}</div>
      </CardContent>
    </Card>
  );
}

// ─── Bar ────────────────────────────────────────────────────────────────
function Bar({ value, max, color = "bg-primary/70", height = "h-2" }: { value: number; max: number; color?: string; height?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-secondary", height)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

// ─── Table Row helper ──────────────────────────────────────────────────
function TRow({ cells, bold, bg }: { cells: React.ReactNode[]; bold?: boolean; bg?: string }) {
  return (
    <tr className={cn("border-b", bg)}>
      {cells.map((c, i) => (
        <td key={i} className={cn("py-1.5 px-2.5 text-[12px]", bold && "font-bold")}>{c}</td>
      ))}
    </tr>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // Forecast date range
  const [fcFrom, setFcFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [fcTo, setFcTo] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split("T")[0]; });

  useEffect(() => {
    getReservations().then(setAllReservations).catch(() => {});
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const dateLabel = dateFrom || dateTo ? `${dateFrom || "..."} — ${dateTo || "..."}` : "Tüm Tarihler";

  // ─── Filtered reservations ─────────────────────────────────────────
  const fRes = useMemo(() => {
    if (!dateFrom && !dateTo) return allReservations;
    return allReservations.filter((r) => {
      if (dateFrom && r.checkIn < dateFrom) return false;
      if (dateTo && r.checkIn > dateTo) return false;
      return true;
    });
  }, [allReservations, dateFrom, dateTo]);

  const activeRes = useMemo(() => fRes.filter((r) => r.status !== "cancelled" && r.status !== "no-show"), [fRes]);

  // ─── Global KPIs ──────────────────────────────────────────────────
  const totalRevenue = activeRes.reduce((s, r) => s + r.totalAmount, 0);
  const totalPaid = activeRes.reduce((s, r) => s + r.paidAmount, 0);
  const totalBalance = activeRes.reduce((s, r) => s + r.balance, 0);
  const avgRate = avg(activeRes.map((r) => r.ratePerNight));
  const avgStay = avg(activeRes.map((r) => r.nights));
  const totalNights = activeRes.reduce((s, r) => s + r.nights, 0);
  const totalGuests = activeRes.reduce((s, r) => s + r.adults + (r.children || 0), 0);
  const revPar = allRooms.length ? totalRevenue / allRooms.length : 0;

  // ─── Daily ────────────────────────────────────────────────────────
  const todayArrivals = fRes.filter((r) => r.checkIn === today && (r.status === "confirmed" || r.status === "pending"));
  const todayDepartures = fRes.filter((r) => r.checkOut === today && r.status === "checked-in");
  const inHouse = fRes.filter((r) => r.status === "checked-in");
  const noShows = fRes.filter((r) => r.checkIn === today && r.status === "no-show");
  const todayCancellations = fRes.filter((r) => r.status === "cancelled" && r.checkIn === today);

  // ─── Source analysis ──────────────────────────────────────────────
  const bySource = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; nights: number; guests: number; cancelled: number; rates: number[] }> = {};
    fRes.forEach((r) => {
      const src = r.source || "Direkt";
      if (!map[src]) map[src] = { count: 0, revenue: 0, nights: 0, guests: 0, cancelled: 0, rates: [] };
      map[src].count++;
      if (r.status === "cancelled") { map[src].cancelled++; return; }
      if (r.status === "no-show") return;
      map[src].revenue += r.totalAmount;
      map[src].nights += r.nights;
      map[src].guests += r.adults + (r.children || 0);
      map[src].rates.push(r.ratePerNight);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.revenue - a.revenue);
  }, [fRes]);

  // ─── Room type analysis ───────────────────────────────────────────
  const byRoomType = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; nights: number; rates: number[] }> = {};
    activeRes.forEach((r) => {
      const t = r.roomType || "standard";
      if (!map[t]) map[t] = { count: 0, revenue: 0, nights: 0, rates: [] };
      map[t].count++;
      map[t].revenue += r.totalAmount;
      map[t].nights += r.nights;
      map[t].rates.push(r.ratePerNight);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.revenue - a.revenue);
  }, [activeRes]);

  // ─── Meal plan analysis ───────────────────────────────────────────
  const byMealPlan = useMemo(() => {
    const map: Record<string, { count: number; guests: number }> = {};
    activeRes.forEach((r) => {
      const mp = r.mealPlan || "BB";
      if (!map[mp]) map[mp] = { count: 0, guests: 0 };
      map[mp].count++;
      map[mp].guests += r.adults + (r.children || 0);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.count - a.count);
  }, [activeRes]);

  // ─── Nationality analysis ─────────────────────────────────────────
  const byNationality = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    activeRes.forEach((r) => {
      const nat = r.guest.nationality || "TR";
      if (!map[nat]) map[nat] = { count: 0, revenue: 0 };
      map[nat].count++;
      map[nat].revenue += r.totalAmount;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.count - a.count);
  }, [activeRes]);

  // ─── Cancellation analysis ────────────────────────────────────────
  const cancelledRes = fRes.filter((r) => r.status === "cancelled");
  const noShowRes = fRes.filter((r) => r.status === "no-show");
  const cancelRate = pct(cancelledRes.length, fRes.length);
  const noShowRate = pct(noShowRes.length, fRes.length);
  const cancelBySource = useMemo(() => {
    const map: Record<string, { cancelled: number; total: number; lostRevenue: number }> = {};
    fRes.forEach((r) => {
      const src = r.source || "Direkt";
      if (!map[src]) map[src] = { cancelled: 0, total: 0, lostRevenue: 0 };
      map[src].total++;
      if (r.status === "cancelled") { map[src].cancelled++; map[src].lostRevenue += r.totalAmount; }
    });
    return Object.entries(map).sort(([, a], [, b]) => b.cancelled - a.cancelled);
  }, [fRes]);

  // ─── Collection analysis ──────────────────────────────────────────
  const fullyPaid = activeRes.filter((r) => r.balance <= 0);
  const partialPaid = activeRes.filter((r) => r.paidAmount > 0 && r.balance > 0);
  const unpaid = activeRes.filter((r) => r.paidAmount === 0 && r.balance > 0);
  const collectionRate = pct(totalPaid, totalRevenue);

  // ─── Forecast (custom date range) ──────────────────────────────────
  const forecast = useMemo(() => {
    if (!fcFrom || !fcTo) return [];
    const start = new Date(fcFrom);
    const end = new Date(fcTo);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    const days: { date: string; label: string; arrivals: number; departures: number; inHouse: number; revenue: number }[] = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit" });
      const arr = allReservations.filter((r) => r.checkIn === ds && r.status !== "cancelled" && r.status !== "no-show");
      const dep = allReservations.filter((r) => r.checkOut === ds && (r.status === "checked-in" || r.status === "confirmed"));
      const ih = allReservations.filter((r) => r.checkIn <= ds && r.checkOut > ds && (r.status === "checked-in" || r.status === "confirmed"));
      const rev = arr.reduce((s, r) => s + r.totalAmount, 0);
      days.push({ date: ds, label: dayLabel, arrivals: arr.length, departures: dep.length, inHouse: ih.length + arr.length, revenue: rev });
    }
    return days;
  }, [allReservations, fcFrom, fcTo]);
  const fcDayCount = forecast.length;

  // ─── Print handlers ───────────────────────────────────────────────
  const printDaily = () => {
    const arrivalsHtml = todayArrivals.map((r) => `<tr><td>${r.room?.number || "—"}</td><td>${r.guest.firstName} ${r.guest.lastName}</td><td>${r.source}</td><td>${mealLabels[r.mealPlan || "BB"]}</td><td class="c">${r.adults + (r.children || 0)}</td><td class="r">${r.nights} gece</td><td class="r">${r.totalAmount.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    const departuresHtml = todayDepartures.map((r) => `<tr><td>${r.room?.number || "—"}</td><td>${r.guest.firstName} ${r.guest.lastName}</td><td class="r">${r.balance.toLocaleString("tr-TR")} ₺</td><td>${fmtDate(r.checkIn)}</td><td class="c">${r.nights} gece</td></tr>`).join("");
    const inHouseHtml = inHouse.map((r) => `<tr><td>${r.room?.number || "—"}</td><td>${r.guest.firstName} ${r.guest.lastName}</td><td>${r.source}</td><td>${mealLabels[r.mealPlan || "BB"]}</td><td class="c">${r.adults + (r.children || 0)}</td><td>${fmtDate(r.checkOut)}</td><td class="r">${r.balance.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    printReport("Günlük Rapor", `Giriş: ${todayArrivals.length} · Çıkış: ${todayDepartures.length} · Konaklayan: ${inHouse.length}`,
      `<div class="section">Bugün Giriş Yapacaklar (${todayArrivals.length})</div>
      <table><thead><tr><th>Oda</th><th>Misafir</th><th>Kaynak</th><th>Pansiyon</th><th class="c">Kişi</th><th class="r">Gece</th><th class="r">Tutar</th></tr></thead><tbody>${arrivalsHtml || "<tr><td colspan='7' class='c'>Kayıt yok</td></tr>"}</tbody></table>
      <div class="section">Bugün Çıkış Yapacaklar (${todayDepartures.length})</div>
      <table><thead><tr><th>Oda</th><th>Misafir</th><th class="r">Bakiye</th><th>Giriş</th><th class="c">Gece</th></tr></thead><tbody>${departuresHtml || "<tr><td colspan='5' class='c'>Kayıt yok</td></tr>"}</tbody></table>
      <div class="section">Konaklayan Misafirler (${inHouse.length})</div>
      <table><thead><tr><th>Oda</th><th>Misafir</th><th>Kaynak</th><th>Pansiyon</th><th class="c">Kişi</th><th>Çıkış</th><th class="r">Bakiye</th></tr></thead><tbody>${inHouseHtml || "<tr><td colspan='7' class='c'>Kayıt yok</td></tr>"}</tbody></table>`
    );
  };

  const printSource = () => {
    const rows = bySource.map(([src, d]) => `<tr><td><strong>${src}</strong></td><td class="c">${d.count}</td><td class="r">${d.revenue.toLocaleString("tr-TR")} ₺</td><td class="r">${Math.round(avg(d.rates)).toLocaleString("tr-TR")} ₺</td><td class="c">${d.nights}</td><td class="c">${d.guests}</td><td class="c">${d.cancelled}</td><td class="c">${pct(d.revenue, totalRevenue)}%</td></tr>`).join("");
    printReport("Kaynak Bazlı Gelir Raporu", `${bySource.length} kaynak · Toplam: ${formatCurrency(totalRevenue)}`,
      `<table><thead><tr><th>Kaynak</th><th class="c">Rez</th><th class="r">Gelir</th><th class="r">Ort. Fiyat</th><th class="c">Gece</th><th class="c">Kişi</th><th class="c">İptal</th><th class="c">Pay</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const dtSub = dateLabel !== "Tüm Tarihler" ? ` · ${dateLabel}` : "";

  const printRevenue = () => {
    const rows = bySource.map(([src, d]) => {
      const srcAR = activeRes.filter((r) => (r.source || "Direkt") === src);
      const sp = srcAR.reduce((s, r) => s + r.paidAmount, 0);
      const sb = srcAR.reduce((s, r) => s + r.balance, 0);
      return `<tr><td>${src}</td><td class="r">${d.revenue.toLocaleString("tr-TR")} ₺</td><td class="r">${sp.toLocaleString("tr-TR")} ₺</td><td class="r">${sb.toLocaleString("tr-TR")} ₺</td><td class="c">${Math.round(avg(d.rates)).toLocaleString("tr-TR")} ₺</td><td class="c">${pct(d.revenue, totalRevenue)}%</td></tr>`;
    }).join("");
    printReport("Gelir Raporu", `Toplam: ${formatCurrency(totalRevenue)} · Tahsil: ${formatCurrency(totalPaid)} · Bakiye: ${formatCurrency(totalBalance)}${dtSub}`,
      `<table><thead><tr><th>Kaynak</th><th class="r">Brüt Gelir</th><th class="r">Tahsil</th><th class="r">Bakiye</th><th class="c">Ort. Fiyat</th><th class="c">Pay</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const printOccupancy = () => {
    const roomStats = Object.entries(allRooms.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = { total: 0, occupied: 0 };
      acc[r.type].total++;
      if (r.status === "occupied") acc[r.type].occupied++;
      return acc;
    }, {} as Record<string, { total: number; occupied: number }>));
    const rows = roomStats.map(([type, d]) => `<tr><td>${typeLabels[type] || type}</td><td class="c">${d.total}</td><td class="c">${d.occupied}</td><td class="c">${pct(d.occupied, d.total)}%</td></tr>`).join("");
    const totalOccupied = allRooms.filter((r) => r.status === "occupied").length;
    const occRate = allRooms.length ? Math.round((totalOccupied / allRooms.length) * 100) : 0;
    printReport("Doluluk Raporu", `Toplam: ${allRooms.length} oda · Dolu: ${totalOccupied} · Doluluk: %${occRate}${dtSub}`,
      `<table><thead><tr><th>Oda Tipi</th><th class="c">Toplam</th><th class="c">Dolu</th><th class="c">Doluluk</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const printGuests = () => {
    const natRows = byNationality.map(([nat, d]) => `<tr><td>${nationalityLabels[nat] || nat}</td><td class="c">${d.count}</td><td class="c">${pct(d.count, activeRes.length)}%</td><td class="r">${d.revenue.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    const guestRows = activeRes.map((r) => `<tr><td>${r.guest.firstName} ${r.guest.lastName}</td><td>${nationalityLabels[r.guest.nationality] || r.guest.nationality}</td><td>${r.source}</td><td>${typeLabels[r.roomType] || r.roomType}</td><td>${fmtDate(r.checkIn)}</td><td>${fmtDate(r.checkOut)}</td><td class="c">${r.nights}</td><td class="r">${r.totalAmount.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    printReport("Misafir Raporu", `${totalGuests} kişi · ${byNationality.length} milliyet${dtSub}`,
      `<div class="section">Milliyet Dağılımı</div>
      <table><thead><tr><th>Milliyet</th><th class="c">Sayı</th><th class="c">Oran</th><th class="r">Gelir</th></tr></thead><tbody>${natRows}</tbody></table>
      <div class="section">Münferit Misafir Listesi (${activeRes.length})</div>
      <table><thead><tr><th>Misafir</th><th>Milliyet</th><th>Kaynak</th><th>Oda Tipi</th><th>Giriş</th><th>Çıkış</th><th class="c">Gece</th><th class="r">Tutar</th></tr></thead><tbody>${guestRows}</tbody></table>`);
  };

  const printMeal = () => {
    const mpRows = byMealPlan.map(([mp, d]) => `<tr><td>${mealLabels[mp] || mp}</td><td class="c">${d.count}</td><td class="c">${pct(d.count, activeRes.length)}%</td><td class="c">${d.guests}</td><td class="c">${pct(d.guests, totalGuests)}%</td></tr>`).join("");
    const matrixRows = bySource.map(([src]) => {
      const srcRes = activeRes.filter((r) => (r.source || "Direkt") === src);
      const cells = ["RO", "BB", "HB", "FB", "AI"].map((mp) => `<td class="c">${srcRes.filter((r) => (r.mealPlan || "BB") === mp).length || "—"}</td>`).join("");
      return `<tr><td>${src}</td>${cells}<td class="c"><strong>${srcRes.length}</strong></td></tr>`;
    }).join("");
    printReport("Yemek Planı Raporu", `${activeRes.length} rezervasyon · ${totalGuests} kişi${dtSub}`,
      `<table><thead><tr><th>Pansiyon</th><th class="c">Rez</th><th class="c">Rez %</th><th class="c">Kişi</th><th class="c">Kişi %</th></tr></thead><tbody>${mpRows}</tbody></table>
      <div class="section">Kaynak × Pansiyon Matrisi</div>
      <table><thead><tr><th>Kaynak</th><th class="c">RO</th><th class="c">BB</th><th class="c">HB</th><th class="c">FB</th><th class="c">AI</th><th class="c">Toplam</th></tr></thead><tbody>${matrixRows}</tbody></table>`);
  };

  const printCancel = () => {
    const srcRows = cancelBySource.map(([src, d]) => `<tr><td>${src}</td><td class="c">${d.total}</td><td class="c">${d.cancelled}</td><td class="c">${pct(d.cancelled, d.total)}%</td><td class="r">${d.lostRevenue.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    const detailRows = cancelledRes.map((r) => `<tr><td>${r.confirmationNumber}</td><td>${r.guest.firstName} ${r.guest.lastName}</td><td>${r.source}</td><td>${fmtDate(r.checkIn)}</td><td class="c">${r.nights}</td><td class="r">${r.totalAmount.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    printReport("İptal & No-Show Raporu", `${cancelledRes.length} iptal · ${noShowRes.length} no-show · İptal oranı: %${cancelRate}${dtSub}`,
      `<div class="section">Kaynak Bazlı İptal</div>
      <table><thead><tr><th>Kaynak</th><th class="c">Toplam</th><th class="c">İptal</th><th class="c">Oran</th><th class="r">Kaybedilen</th></tr></thead><tbody>${srcRows}</tbody></table>
      ${cancelledRes.length > 0 ? `<div class="section">İptal Edilen Rezervasyonlar</div><table><thead><tr><th>Konfirmasyon</th><th>Misafir</th><th>Kaynak</th><th>Giriş</th><th class="c">Gece</th><th class="r">Tutar</th></tr></thead><tbody>${detailRows}</tbody></table>` : ""}`);
  };

  const printCollection = () => {
    const rows = activeRes.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance).map((r) => `<tr><td>${r.guest.firstName} ${r.guest.lastName}</td><td>${r.source}</td><td>${r.paidAmount > 0 ? "Kısmi" : "Ödenmedi"}</td><td class="r">${r.totalAmount.toLocaleString("tr-TR")} ₺</td><td class="r">${r.paidAmount.toLocaleString("tr-TR")} ₺</td><td class="r">${r.balance.toLocaleString("tr-TR")} ₺</td></tr>`).join("");
    printReport("Tahsilat Raporu", `Toplam: ${formatCurrency(totalRevenue)} · Tahsil: ${formatCurrency(totalPaid)} · Bakiye: ${formatCurrency(totalBalance)} · Oran: %${collectionRate}${dtSub}`,
      `<div class="section">Özet</div>
      <table><thead><tr><th>Durum</th><th class="c">Adet</th></tr></thead><tbody><tr><td>Tam Ödenmiş</td><td class="c">${fullyPaid.length}</td></tr><tr><td>Kısmi Ödenmiş</td><td class="c">${partialPaid.length}</td></tr><tr><td>Ödenmemiş</td><td class="c">${unpaid.length}</td></tr></tbody></table>
      <div class="section">Bakiye Bekleyen Rezervasyonlar</div>
      <table><thead><tr><th>Misafir</th><th>Kaynak</th><th>Durum</th><th class="r">Toplam</th><th class="r">Ödenen</th><th class="r">Bakiye</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const printRoomType = () => {
    const rows = byRoomType.map(([type, d]) => {
      const inv = allRooms.filter((r) => r.type === type).length;
      return `<tr><td>${typeLabels[type] || type}</td><td class="c">${inv}</td><td class="c">${d.count}</td><td class="r">${d.revenue.toLocaleString("tr-TR")} ₺</td><td class="r">${Math.round(avg(d.rates)).toLocaleString("tr-TR")} ₺</td><td class="c">${d.nights}</td><td class="c">${pct(d.revenue, totalRevenue)}%</td></tr>`;
    }).join("");
    printReport("Oda Tipi Performans Raporu", `${allRooms.length} oda · ${activeRes.length} rez · Toplam: ${formatCurrency(totalRevenue)}${dtSub}`,
      `<table><thead><tr><th>Oda Tipi</th><th class="c">Envanter</th><th class="c">Rez</th><th class="r">Gelir</th><th class="r">Ort. Fiyat</th><th class="c">Gece</th><th class="c">Pay</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const printForecast = () => {
    const rows = forecast.map((d) => {
      const occ = allRooms.length ? Math.min(100, Math.round((d.inHouse / allRooms.length) * 100)) : 0;
      return `<tr><td>${d.label}</td><td class="c">${d.arrivals}</td><td class="c">${d.departures}</td><td class="c">${d.inHouse}</td><td class="c">${occ}%</td><td class="r">${d.revenue.toLocaleString("tr-TR")} ₺</td></tr>`;
    }).join("");
    const totals = `<tr style="font-weight:700;border-top:2px solid #000"><td>${fcDayCount} Gün Toplam</td><td class="c">${forecast.reduce((s, d) => s + d.arrivals, 0)}</td><td class="c">${forecast.reduce((s, d) => s + d.departures, 0)}</td><td class="c">—</td><td class="c">—</td><td class="r">${forecast.reduce((s, d) => s + d.revenue, 0).toLocaleString("tr-TR")} ₺</td></tr>`;
    printReport("Forecast Raporu", `${fmtDate(fcFrom)} — ${fmtDate(fcTo)} · ${fcDayCount} gün`,
      `<table><thead><tr><th>Tarih</th><th class="c">Giriş</th><th class="c">Çıkış</th><th class="c">Konaklayan</th><th class="c">Doluluk</th><th class="r">Gelir</th></tr></thead><tbody>${rows}${totals}</tbody></table>`);
  };

  // ─── Main Return ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Raporlar & Analizler</h1>
          <p className="text-[13px] text-muted-foreground">Detaylı otel performans raporları · {activeRes.length} aktif rezervasyon</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setDateFilterOpen(!dateFilterOpen)}>
              <Calendar className="mr-1.5 h-3.5 w-3.5" />{dateLabel}
            </Button>
            {dateFilterOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-md border bg-card p-3 shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Başlangıç</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-[12px]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Bitiş</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-0.5 w-full rounded border px-2 py-1 text-[12px]" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setDateFrom(""); setDateTo(""); }}>Temizle</Button>
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => setDateFilterOpen(false)}>Uygula</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <KPI icon={DollarSign} label="Toplam Gelir" value={formatCurrency(totalRevenue)} color="emerald" />
        <KPI icon={TrendingUp} label="ADR" value={formatCurrency(Math.round(avgRate))} sub="Gecelik ortalama" color="blue" />
        <KPI icon={BarChart3} label="RevPAR" value={formatCurrency(Math.round(revPar))} sub="Oda başı gelir" color="purple" />
        <KPI icon={BedDouble} label="Ort. Konaklama" value={`${avgStay.toFixed(1)} gece`} color="amber" />
        <KPI icon={Users} label="Toplam Kişi" value={String(totalGuests)} color="blue" />
        <KPI icon={Hotel} label="Toplam Gece" value={String(totalNights)} color="slate" />
        <KPI icon={CreditCard} label="Tahsilat" value={`%${collectionRate}`} sub={formatCurrency(totalPaid)} color="emerald" />
        <KPI icon={XCircle} label="İptal Oranı" value={`%${cancelRate}`} sub={`${cancelledRes.length} iptal`} color="rose" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="daily" className="text-[12px]"><CalendarCheck className="mr-1 h-3 w-3" />Günlük</TabsTrigger>
          <TabsTrigger value="source" className="text-[12px]"><Globe className="mr-1 h-3 w-3" />Kaynak Bazlı</TabsTrigger>
          <TabsTrigger value="revenue" className="text-[12px]"><DollarSign className="mr-1 h-3 w-3" />Gelir</TabsTrigger>
          <TabsTrigger value="occupancy" className="text-[12px]"><BedDouble className="mr-1 h-3 w-3" />Doluluk</TabsTrigger>
          <TabsTrigger value="guests" className="text-[12px]"><Users className="mr-1 h-3 w-3" />Misafir</TabsTrigger>
          <TabsTrigger value="meal" className="text-[12px]"><Coffee className="mr-1 h-3 w-3" />Yemek Planı</TabsTrigger>
          <TabsTrigger value="cancel" className="text-[12px]"><XCircle className="mr-1 h-3 w-3" />İptal</TabsTrigger>
          <TabsTrigger value="collection" className="text-[12px]"><CreditCard className="mr-1 h-3 w-3" />Tahsilat</TabsTrigger>
          <TabsTrigger value="roomtype" className="text-[12px]"><Hotel className="mr-1 h-3 w-3" />Oda Tipi</TabsTrigger>
          <TabsTrigger value="forecast" className="text-[12px]"><TrendingUp className="mr-1 h-3 w-3" />Forecast</TabsTrigger>
        </TabsList>

        {/* ═══════════ 1. GÜNLÜK RAPOR ═══════════ */}
        <TabsContent value="daily" className="space-y-4">
          <ReportHeader title="Günlük Operasyon Raporu" dateLabel={dateLabel} onPrint={printDaily} />

          <div className="grid gap-3 sm:grid-cols-5">
            <KPI icon={ArrowUpRight} label="Bugün Giriş" value={String(todayArrivals.length)} color="emerald" />
            <KPI icon={ArrowDownRight} label="Bugün Çıkış" value={String(todayDepartures.length)} color="amber" />
            <KPI icon={BedDouble} label="Konaklayan" value={String(inHouse.length)} color="blue" />
            <KPI icon={AlertTriangle} label="No-Show" value={String(noShows.length)} color="rose" />
            <KPI icon={XCircle} label="Bugün İptal" value={String(todayCancellations.length)} color="slate" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Arrivals */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px] flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-500" />Bugün Giriş ({todayArrivals.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[12px]">
                  <thead><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Oda</th><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-left">Pansiyon</th><th className="px-3 py-1.5 text-right">Tutar</th></tr></thead>
                  <tbody>
                    {todayArrivals.length === 0 ? <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Bugün giriş yok</td></tr> :
                      todayArrivals.map((r) => <TRow key={r.id} cells={[r.room?.number || "—", `${r.guest.firstName} ${r.guest.lastName}`, r.source, mealLabels[r.mealPlan || "BB"], formatCurrency(r.totalAmount)]} />)}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Departures */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px] flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-amber-500" />Bugün Çıkış ({todayDepartures.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-[12px]">
                  <thead><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Oda</th><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-right">Bakiye</th><th className="px-3 py-1.5 text-center">Gece</th></tr></thead>
                  <tbody>
                    {todayDepartures.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Bugün çıkış yok</td></tr> :
                      todayDepartures.map((r) => <TRow key={r.id} cells={[r.room?.number || "—", `${r.guest.firstName} ${r.guest.lastName}`, <span key="bal" className={r.balance > 0 ? "text-destructive font-medium" : ""}>{formatCurrency(r.balance)}</span>, r.nights]} />)}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* In-house */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px] flex items-center gap-2"><BedDouble className="h-4 w-4 text-blue-500" />Konaklayan Misafirler ({inHouse.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Oda</th><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-left">Pansiyon</th><th className="px-3 py-1.5 text-center">Kişi</th><th className="px-3 py-1.5 text-left">Çıkış</th><th className="px-3 py-1.5 text-right">Bakiye</th></tr></thead>
                <tbody>
                  {inHouse.length === 0 ? <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Konaklayan misafir yok</td></tr> :
                    inHouse.map((r) => <TRow key={r.id} cells={[<span key="room" className="font-semibold">{r.room?.number || "—"}</span>, `${r.guest.firstName} ${r.guest.lastName}`, r.source, <Badge key="meal" variant="secondary" className="text-[9px]">{mealLabels[r.mealPlan || "BB"]}</Badge>, r.adults + (r.children || 0), fmtDate(r.checkOut), <span key="bal" className={r.balance > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{formatCurrency(r.balance)}</span>]} />)}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ 2. KAYNAK BAZLI RAPOR ═══════════ */}
        <TabsContent value="source" className="space-y-4">
          <ReportHeader title="Kaynak / Kanal Bazlı Rapor" dateLabel={dateLabel} onPrint={printSource} />

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold">Kaynak</th>
                    <th className="px-3 py-2 text-center font-semibold">Rezervasyon</th>
                    <th className="px-3 py-2 text-right font-semibold">Gelir</th>
                    <th className="px-3 py-2 text-right font-semibold">Ort. Fiyat</th>
                    <th className="px-3 py-2 text-center font-semibold">Toplam Gece</th>
                    <th className="px-3 py-2 text-center font-semibold">Toplam Kişi</th>
                    <th className="px-3 py-2 text-center font-semibold">İptal</th>
                    <th className="px-3 py-2 text-center font-semibold">Gelir Payı</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map(([src, d], i) => {
                    const srcAvg = Math.round(avg(d.rates));
                    const share = pct(d.revenue, totalRevenue);
                    const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];
                    return (
                      <tr key={src} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 font-semibold flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full", colors[i % colors.length])} />{src}
                        </td>
                        <td className="px-3 py-2 text-center">{d.count}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(d.revenue)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(srcAvg)}</td>
                        <td className="px-3 py-2 text-center">{d.nights}</td>
                        <td className="px-3 py-2 text-center">{d.guests}</td>
                        <td className="px-3 py-2 text-center">{d.cancelled > 0 ? <Badge variant="destructive" className="text-[9px]">{d.cancelled}</Badge> : "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Bar value={share} max={100} color={colors[i % colors.length]} />
                            <span className="text-[11px] font-medium w-8 text-right">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td className="px-3 py-2 font-bold">TOPLAM</td>
                    <td className="px-3 py-2 text-center font-bold">{fRes.length}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(totalRevenue)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(Math.round(avgRate))}</td>
                    <td className="px-3 py-2 text-center font-bold">{totalNights}</td>
                    <td className="px-3 py-2 text-center font-bold">{totalGuests}</td>
                    <td className="px-3 py-2 text-center font-bold">{cancelledRes.length}</td>
                    <td className="px-3 py-2 text-center font-bold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Source visual bars */}
          <div className="grid gap-3 lg:grid-cols-2">
            {bySource.slice(0, 6).map(([src, d], i) => {
              const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500"];
              return (
                <Card key={src}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", colors[i % colors.length])} />
                        <span className="text-[13px] font-semibold">{src}</span>
                      </div>
                      <span className="text-[13px] font-bold">{formatCurrency(d.revenue)}</span>
                    </div>
                    <Bar value={d.revenue} max={Math.max(...bySource.map(([, x]) => x.revenue))} color={colors[i % colors.length]} height="h-3" />
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>{d.count} rez · {d.nights} gece · {d.guests} kişi</span>
                      <span>Ort: {formatCurrency(Math.round(avg(d.rates)))}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══════════ 3. GELİR RAPORU ═══════════ */}
        <TabsContent value="revenue" className="space-y-4">
          <ReportHeader title="Gelir Raporu" dateLabel={dateLabel} onPrint={printRevenue} />

          <div className="grid gap-3 sm:grid-cols-4">
            <KPI icon={DollarSign} label="Brüt Gelir" value={formatCurrency(totalRevenue)} color="emerald" />
            <KPI icon={CreditCard} label="Tahsil Edilen" value={formatCurrency(totalPaid)} color="blue" />
            <KPI icon={AlertTriangle} label="Bekleyen Bakiye" value={formatCurrency(totalBalance)} color="rose" />
            <KPI icon={Percent} label="Tahsilat Oranı" value={`%${collectionRate}`} color="amber" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue by source pie-like */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Kaynak Bazlı Gelir Dağılımı</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bySource.map(([src, d], i) => {
                    const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
                    return (
                      <div key={src}>
                        <div className="flex items-center justify-between text-[12px] mb-1">
                          <div className="flex items-center gap-2"><div className={cn("h-2.5 w-2.5 rounded-full", colors[i % colors.length])} /><span>{src}</span></div>
                          <span className="font-semibold">{formatCurrency(d.revenue)}</span>
                        </div>
                        <Bar value={d.revenue} max={totalRevenue} color={colors[i % colors.length]} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by room type */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Oda Tipi Bazlı Gelir</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byRoomType.map(([type, d]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span>{typeLabels[type] || type}</span>
                        <span className="font-semibold">{formatCurrency(d.revenue)}</span>
                      </div>
                      <Bar value={d.revenue} max={totalRevenue} color="bg-primary/70" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{d.count} rez · Ort: {formatCurrency(Math.round(avg(d.rates)))}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue breakdown table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Gelir Detay Tablosu</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-right">Brüt Gelir</th><th className="px-3 py-1.5 text-right">Tahsil</th><th className="px-3 py-1.5 text-right">Bakiye</th><th className="px-3 py-1.5 text-center">Ort. Fiyat</th><th className="px-3 py-1.5 text-center">Pay</th></tr></thead>
                <tbody>
                  {bySource.map(([src, d]) => {
                    const srcActiveRes = activeRes.filter((r) => (r.source || "Direkt") === src);
                    const srcPaid = srcActiveRes.reduce((s, r) => s + r.paidAmount, 0);
                    const srcBal = srcActiveRes.reduce((s, r) => s + r.balance, 0);
                    return (
                      <tr key={src} className="border-b">
                        <td className="px-3 py-1.5 font-medium">{src}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(d.revenue)}</td>
                        <td className="px-3 py-1.5 text-right text-emerald-600">{formatCurrency(srcPaid)}</td>
                        <td className="px-3 py-1.5 text-right text-destructive">{formatCurrency(srcBal)}</td>
                        <td className="px-3 py-1.5 text-center">{formatCurrency(Math.round(avg(d.rates)))}</td>
                        <td className="px-3 py-1.5 text-center">{pct(d.revenue, totalRevenue)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="border-t-2 bg-muted/30 font-bold"><td className="px-3 py-1.5">TOPLAM</td><td className="px-3 py-1.5 text-right">{formatCurrency(totalRevenue)}</td><td className="px-3 py-1.5 text-right text-emerald-600">{formatCurrency(totalPaid)}</td><td className="px-3 py-1.5 text-right text-destructive">{formatCurrency(totalBalance)}</td><td className="px-3 py-1.5 text-center">{formatCurrency(Math.round(avgRate))}</td><td className="px-3 py-1.5 text-center">100%</td></tr></tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ 4. DOLULUK RAPORU ═══════════ */}
        <TabsContent value="occupancy" className="space-y-4">
          <ReportHeader title="Doluluk & Performans Raporu" dateLabel={dateLabel} onPrint={printOccupancy} />
          <div className="grid gap-3 sm:grid-cols-4">
            <KPI icon={Hotel} label="Toplam Oda" value={String(allRooms.length)} color="slate" />
            <KPI icon={BedDouble} label="Dolu Oda" value={String(allRooms.filter((r) => r.status === "occupied").length)} color="blue" />
            <KPI icon={Percent} label="Doluluk Oranı" value={`%${allRooms.length ? Math.round((allRooms.filter((r) => r.status === "occupied").length / allRooms.length) * 100) : 0}`} color="emerald" />
            <KPI icon={BarChart3} label="RevPAR" value={formatCurrency(Math.round(revPar))} color="purple" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Room status */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Oda Durumu Özeti</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: "Dolu - Temiz", count: allRooms.filter((r) => r.status === "occupied").length, color: "bg-blue-500" },
                    { label: "Boş - Temiz", count: allRooms.filter((r) => r.status === "vacant-clean").length, color: "bg-emerald-500" },
                    { label: "Boş - Kirli", count: allRooms.filter((r) => r.status === "vacant-dirty").length, color: "bg-amber-500" },
                    { label: "Bakımda", count: allRooms.filter((r) => r.status === "maintenance").length, color: "bg-rose-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[12px]"><div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />{item.label}</div>
                      <div className="flex items-center gap-2">
                        <Bar value={item.count} max={allRooms.length} color={item.color} />
                        <span className="text-[12px] font-medium w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Room type occupancy */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Oda Tipi Doluluk</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(allRooms.reduce((acc, r) => {
                    if (!acc[r.type]) acc[r.type] = { total: 0, occupied: 0 };
                    acc[r.type].total++;
                    if (r.status === "occupied") acc[r.type].occupied++;
                    return acc;
                  }, {} as Record<string, { total: number; occupied: number }>)).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-[12px]">{typeLabels[type] || type}</span>
                      <div className="flex items-center gap-2">
                        <Bar value={data.occupied} max={data.total} color="bg-primary/70" />
                        <span className="text-[12px] font-medium w-16 text-right">{data.occupied}/{data.total} (%{pct(data.occupied, data.total)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════ 5. MİSAFİR RAPORU ═══════════ */}
        <TabsContent value="guests" className="space-y-4">
          <ReportHeader title="Misafir Analiz Raporu" dateLabel={dateLabel} onPrint={printGuests} />
          <div className="grid gap-3 sm:grid-cols-4">
            <KPI icon={Users} label="Toplam Misafir" value={String(totalGuests)} color="blue" />
            <KPI icon={UserCheck} label="Yetişkin" value={String(activeRes.reduce((s, r) => s + r.adults, 0))} color="emerald" />
            <KPI icon={Users} label="Çocuk" value={String(activeRes.reduce((s, r) => s + (r.children || 0), 0))} color="amber" />
            <KPI icon={Globe} label="Milliyet Çeşidi" value={String(byNationality.length)} color="purple" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Nationality */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Milliyet Dağılımı</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byNationality.map(([nat, d]) => (
                    <div key={nat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span>{nationalityFlags[nat] || "🏳️"}</span>
                        <span>{nationalityLabels[nat] || nat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bar value={d.count} max={byNationality[0]?.[1].count || 1} color="bg-primary/70" />
                        <span className="text-[12px] font-medium w-16 text-right">{d.count} (%{pct(d.count, activeRes.length)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nationality revenue */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Milliyet Bazlı Gelir</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byNationality.map(([nat, d]) => (
                    <div key={nat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span>{nationalityFlags[nat] || "🏳️"}</span>
                        <span>{nationalityLabels[nat] || nat}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bar value={d.revenue} max={byNationality[0]?.[1].revenue || 1} color="bg-emerald-500" />
                        <span className="text-[12px] font-medium w-20 text-right">{formatCurrency(d.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guest detail table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Münferit Misafir Listesi</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card"><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-left">Milliyet</th><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-left">Oda Tipi</th><th className="px-3 py-1.5 text-left">Giriş</th><th className="px-3 py-1.5 text-left">Çıkış</th><th className="px-3 py-1.5 text-center">Gece</th><th className="px-3 py-1.5 text-right">Tutar</th></tr></thead>
                <tbody>
                  {activeRes.map((r, i) => (
                    <tr key={r.id} className={cn("border-b", i % 2 === 0 ? "bg-muted/10" : "")}>
                      <td className="px-3 py-1.5 font-medium">{r.guest.firstName} {r.guest.lastName}</td>
                      <td className="px-3 py-1.5">{nationalityFlags[r.guest.nationality] || ""} {nationalityLabels[r.guest.nationality] || r.guest.nationality}</td>
                      <td className="px-3 py-1.5">{r.source}</td>
                      <td className="px-3 py-1.5">{typeLabels[r.roomType] || r.roomType}</td>
                      <td className="px-3 py-1.5">{fmtDate(r.checkIn)}</td>
                      <td className="px-3 py-1.5">{fmtDate(r.checkOut)}</td>
                      <td className="px-3 py-1.5 text-center">{r.nights}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ 6. YEMEK PLANI RAPORU ═══════════ */}
        <TabsContent value="meal" className="space-y-4">
          <ReportHeader title="Yemek Planı / Kahvaltı Raporu" dateLabel={dateLabel} onPrint={printMeal} />
          <div className="grid gap-3 sm:grid-cols-5">
            {byMealPlan.map(([mp, d]) => (
              <KPI key={mp} icon={Coffee} label={mealLabels[mp] || mp} value={String(d.count)} sub={`${d.guests} kişi`} color={mp === "AI" ? "purple" : mp === "FB" ? "emerald" : mp === "HB" ? "amber" : mp === "BB" ? "blue" : "slate"} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Pansiyon Dağılımı (Rezervasyon)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byMealPlan.map(([mp, d]) => (
                    <div key={mp}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span>{mealLabels[mp] || mp}</span>
                        <span className="font-semibold">{d.count} rez (%{pct(d.count, activeRes.length)})</span>
                      </div>
                      <Bar value={d.count} max={activeRes.length} color="bg-amber-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Pansiyon Dağılımı (Kişi Sayısı)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byMealPlan.map(([mp, d]) => (
                    <div key={mp}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span>{mealLabels[mp] || mp}</span>
                        <span className="font-semibold">{d.guests} kişi (%{pct(d.guests, totalGuests)})</span>
                      </div>
                      <Bar value={d.guests} max={totalGuests} color="bg-blue-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meal by source */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Kaynak × Pansiyon Matrisi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-1.5 text-left">Kaynak</th>
                    {["RO", "BB", "HB", "FB", "AI"].map((mp) => <th key={mp} className="px-3 py-1.5 text-center">{mp}</th>)}
                    <th className="px-3 py-1.5 text-center font-bold">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map(([src]) => {
                    const srcRes = activeRes.filter((r) => (r.source || "Direkt") === src);
                    return (
                      <tr key={src} className="border-b">
                        <td className="px-3 py-1.5 font-medium">{src}</td>
                        {["RO", "BB", "HB", "FB", "AI"].map((mp) => {
                          const c = srcRes.filter((r) => (r.mealPlan || "BB") === mp).length;
                          return <td key={mp} className="px-3 py-1.5 text-center">{c || "—"}</td>;
                        })}
                        <td className="px-3 py-1.5 text-center font-bold">{srcRes.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ 7. İPTAL RAPORU ═══════════ */}
        <TabsContent value="cancel" className="space-y-4">
          <ReportHeader title="İptal & No-Show Raporu" dateLabel={dateLabel} onPrint={printCancel} />
          <div className="grid gap-3 sm:grid-cols-4">
            <KPI icon={XCircle} label="Toplam İptal" value={String(cancelledRes.length)} color="rose" />
            <KPI icon={AlertTriangle} label="No-Show" value={String(noShowRes.length)} color="amber" />
            <KPI icon={Percent} label="İptal Oranı" value={`%${cancelRate}`} color="rose" />
            <KPI icon={TrendingDown} label="Kaybedilen Gelir" value={formatCurrency(cancelledRes.reduce((s, r) => s + r.totalAmount, 0))} color="slate" />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Kaynak Bazlı İptal Analizi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-center">Toplam</th><th className="px-3 py-1.5 text-center">İptal</th><th className="px-3 py-1.5 text-center">İptal Oranı</th><th className="px-3 py-1.5 text-right">Kaybedilen Gelir</th><th className="px-3 py-1.5">Görsel</th></tr></thead>
                <tbody>
                  {cancelBySource.map(([src, d]) => (
                    <tr key={src} className="border-b">
                      <td className="px-3 py-1.5 font-medium">{src}</td>
                      <td className="px-3 py-1.5 text-center">{d.total}</td>
                      <td className="px-3 py-1.5 text-center">{d.cancelled > 0 ? <Badge variant="destructive" className="text-[9px]">{d.cancelled}</Badge> : "0"}</td>
                      <td className="px-3 py-1.5 text-center">{pct(d.cancelled, d.total)}%</td>
                      <td className="px-3 py-1.5 text-right text-destructive font-medium">{formatCurrency(d.lostRevenue)}</td>
                      <td className="px-3 py-1.5"><Bar value={d.cancelled} max={Math.max(...cancelBySource.map(([, x]) => x.cancelled), 1)} color="bg-rose-500" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Cancelled reservation list */}
          {cancelledRes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">İptal Edilen Rezervasyonlar</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-card"><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Konfirmasyon</th><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-left">Giriş</th><th className="px-3 py-1.5 text-center">Gece</th><th className="px-3 py-1.5 text-right">Tutar</th></tr></thead>
                  <tbody>
                    {cancelledRes.map((r, i) => (
                      <tr key={r.id} className={cn("border-b", i % 2 === 0 ? "bg-muted/10" : "")}>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{r.confirmationNumber}</td>
                        <td className="px-3 py-1.5">{r.guest.firstName} {r.guest.lastName}</td>
                        <td className="px-3 py-1.5">{r.source}</td>
                        <td className="px-3 py-1.5">{fmtDate(r.checkIn)}</td>
                        <td className="px-3 py-1.5 text-center">{r.nights}</td>
                        <td className="px-3 py-1.5 text-right text-destructive">{formatCurrency(r.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════ 8. TAHSİLAT RAPORU ═══════════ */}
        <TabsContent value="collection" className="space-y-4">
          <ReportHeader title="Tahsilat & Ödeme Raporu" dateLabel={dateLabel} onPrint={printCollection} />
          <div className="grid gap-3 sm:grid-cols-4">
            <KPI icon={DollarSign} label="Toplam Tutar" value={formatCurrency(totalRevenue)} color="slate" />
            <KPI icon={CreditCard} label="Tahsil Edilen" value={formatCurrency(totalPaid)} color="emerald" />
            <KPI icon={AlertTriangle} label="Bekleyen" value={formatCurrency(totalBalance)} color="rose" />
            <KPI icon={Percent} label="Tahsilat Oranı" value={`%${collectionRate}`} color="blue" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{fullyPaid.length}</p><p className="text-[11px] text-muted-foreground">Tam Ödenmiş</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{partialPaid.length}</p><p className="text-[11px] text-muted-foreground">Kısmi Ödenmiş</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-rose-600">{unpaid.length}</p><p className="text-[11px] text-muted-foreground">Ödenmemiş</p></CardContent></Card>
          </div>

          {/* Outstanding balances */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Bakiye Bekleyen Rezervasyonlar</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-card"><tr className="border-b bg-muted/40"><th className="px-3 py-1.5 text-left">Misafir</th><th className="px-3 py-1.5 text-left">Kaynak</th><th className="px-3 py-1.5 text-left">Durum</th><th className="px-3 py-1.5 text-right">Toplam</th><th className="px-3 py-1.5 text-right">Ödenen</th><th className="px-3 py-1.5 text-right">Bakiye</th></tr></thead>
                <tbody>
                  {activeRes.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance).map((r, i) => (
                    <tr key={r.id} className={cn("border-b", i % 2 === 0 ? "bg-muted/10" : "")}>
                      <td className="px-3 py-1.5 font-medium">{r.guest.firstName} {r.guest.lastName}</td>
                      <td className="px-3 py-1.5">{r.source}</td>
                      <td className="px-3 py-1.5"><Badge variant={r.paidAmount > 0 ? "warning" : "destructive"} className="text-[9px]">{r.paidAmount > 0 ? "Kısmi" : "Ödenmedi"}</Badge></td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(r.totalAmount)}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-600">{formatCurrency(r.paidAmount)}</td>
                      <td className="px-3 py-1.5 text-right text-destructive font-bold">{formatCurrency(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t-2 bg-muted/30 font-bold"><td className="px-3 py-1.5" colSpan={3}>TOPLAM</td><td className="px-3 py-1.5 text-right">{formatCurrency(totalRevenue)}</td><td className="px-3 py-1.5 text-right text-emerald-600">{formatCurrency(totalPaid)}</td><td className="px-3 py-1.5 text-right text-destructive">{formatCurrency(totalBalance)}</td></tr></tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ 9. ODA TİPİ PERFORMANS ═══════════ */}
        <TabsContent value="roomtype" className="space-y-4">
          <ReportHeader title="Oda Tipi Performans Raporu" dateLabel={dateLabel} onPrint={printRoomType} />
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left font-semibold">Oda Tipi</th><th className="px-3 py-2 text-center font-semibold">Envanter</th><th className="px-3 py-2 text-center font-semibold">Rezervasyon</th><th className="px-3 py-2 text-right font-semibold">Gelir</th><th className="px-3 py-2 text-right font-semibold">Ort. Fiyat</th><th className="px-3 py-2 text-center font-semibold">Toplam Gece</th><th className="px-3 py-2 text-center font-semibold">Gelir Payı</th></tr></thead>
                <tbody>
                  {byRoomType.map(([type, d]) => {
                    const inv = allRooms.filter((r) => r.type === type).length;
                    return (
                      <tr key={type} className="border-b hover:bg-muted/20">
                        <td className="px-3 py-2 font-semibold">{typeLabels[type] || type}</td>
                        <td className="px-3 py-2 text-center">{inv} oda</td>
                        <td className="px-3 py-2 text-center">{d.count}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(d.revenue)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(Math.round(avg(d.rates)))}</td>
                        <td className="px-3 py-2 text-center">{d.nights}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Bar value={d.revenue} max={totalRevenue} color="bg-primary/70" />
                            <span className="text-[11px] font-medium w-8 text-right">{pct(d.revenue, totalRevenue)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Room type distribution */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Oda Envanteri</CardTitle><CardDescription className="text-[11px]">Toplam {allRooms.length} oda</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(allRooms.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-[12px]">{typeLabels[type] || type}</span>
                      <div className="flex items-center gap-2">
                        <Bar value={count} max={allRooms.length} color="bg-primary/70" />
                        <span className="text-[12px] font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-[13px]">Oda Başı Gelir (Rev/Room)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byRoomType.map(([type, d]) => {
                    const inv = allRooms.filter((r) => r.type === type).length;
                    const rpr = inv ? d.revenue / inv : 0;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-[12px]">{typeLabels[type] || type}</span>
                        <div className="flex items-center gap-2">
                          <Bar value={rpr} max={Math.max(...byRoomType.map(([, x]) => { const i2 = allRooms.filter((r) => r.type === type).length; return i2 ? x.revenue / i2 : 0; }), 1)} color="bg-emerald-500" />
                          <span className="text-[12px] font-medium w-20 text-right">{formatCurrency(Math.round(rpr))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════ 10. FORECAST ═══════════ */}
        <TabsContent value="forecast" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-[15px] font-bold">Forecast Raporu ({fcDayCount} gün)</h2>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Başlangıç</label>
                <input type="date" value={fcFrom} onChange={(e) => setFcFrom(e.target.value)} className="block mt-0.5 rounded border px-2 py-1 text-[12px] h-8" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Bitiş</label>
                <input type="date" value={fcTo} onChange={(e) => setFcTo(e.target.value)} className="block mt-0.5 rounded border px-2 py-1 text-[12px] h-8" />
              </div>
              <div className="flex gap-1 mt-3.5">
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => { const t = new Date(); setFcFrom(t.toISOString().split("T")[0]); const e = new Date(); e.setDate(e.getDate() + 6); setFcTo(e.toISOString().split("T")[0]); }}>7 Gün</Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => { const t = new Date(); setFcFrom(t.toISOString().split("T")[0]); const e = new Date(); e.setDate(e.getDate() + 13); setFcTo(e.toISOString().split("T")[0]); }}>14 Gün</Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => { const t = new Date(); setFcFrom(t.toISOString().split("T")[0]); const e = new Date(); e.setDate(e.getDate() + 29); setFcTo(e.toISOString().split("T")[0]); }}>30 Gün</Button>
                <Button size="sm" className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm text-[11px]" onClick={printForecast} disabled={forecast.length === 0}><Printer className="mr-1.5 h-4 w-4" />Yazdır</Button>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b bg-muted/40"><th className="px-3 py-2 text-left font-semibold">Tarih</th><th className="px-3 py-2 text-center font-semibold">Giriş</th><th className="px-3 py-2 text-center font-semibold">Çıkış</th><th className="px-3 py-2 text-center font-semibold">Beklenen Konaklayan</th><th className="px-3 py-2 text-center font-semibold">Tahmini Doluluk</th><th className="px-3 py-2 text-right font-semibold">Beklenen Gelir</th></tr></thead>
                <tbody>
                  {forecast.map((d, i) => {
                    const occPct = allRooms.length ? Math.min(100, Math.round((d.inHouse / allRooms.length) * 100)) : 0;
                    return (
                      <tr key={d.date} className={cn("border-b", i === 0 && "bg-primary/5 font-medium")}>
                        <td className="px-3 py-2 font-medium">{d.label}{i === 0 && <Badge className="ml-2 text-[8px]" variant="outline">Bugün</Badge>}</td>
                        <td className="px-3 py-2 text-center">{d.arrivals > 0 ? <Badge variant="info" className="text-[9px]">{d.arrivals}</Badge> : "—"}</td>
                        <td className="px-3 py-2 text-center">{d.departures > 0 ? <Badge variant="warning" className="text-[9px]">{d.departures}</Badge> : "—"}</td>
                        <td className="px-3 py-2 text-center">{d.inHouse}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 justify-center">
                            <Bar value={occPct} max={100} color={occPct > 85 ? "bg-emerald-500" : occPct > 60 ? "bg-blue-500" : "bg-amber-500"} />
                            <span className="w-8 text-right">{occPct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(d.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td className="px-3 py-2">{fcDayCount} Gün Toplam</td>
                    <td className="px-3 py-2 text-center">{forecast.reduce((s, d) => s + d.arrivals, 0)}</td>
                    <td className="px-3 py-2 text-center">{forecast.reduce((s, d) => s + d.departures, 0)}</td>
                    <td className="px-3 py-2 text-center">—</td>
                    <td className="px-3 py-2 text-center">—</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(forecast.reduce((s, d) => s + d.revenue, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Forecast visual */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-[13px]">Doluluk Tahmini (Görsel){fcDayCount > 31 && <span className="text-[10px] text-muted-foreground font-normal ml-2">İlk 31 gün gösteriliyor</span>}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {forecast.slice(0, 31).map((d, i) => {
                  const occPct = allRooms.length ? Math.min(100, Math.round((d.inHouse / allRooms.length) * 100)) : 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium">{occPct}%</span>
                      <div className="w-full bg-secondary rounded-t overflow-hidden" style={{ height: "100px" }}>
                        <div className={cn("w-full rounded-t transition-all", occPct > 85 ? "bg-emerald-500" : occPct > 60 ? "bg-blue-500" : "bg-amber-500")} style={{ height: `${occPct}%`, marginTop: `${100 - occPct}%` }} />
                      </div>
                      <span className={cn("text-[9px]", i === 0 ? "font-bold" : "text-muted-foreground")}>{d.label.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
