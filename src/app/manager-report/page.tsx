"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReservations, getRoomsWithGuests } from "@/lib/data-service";
import { getDailyReports, type DailyReport } from "@/lib/night-audit-service";
import { useAuth } from "@/lib/auth-context";
import type { Reservation, Room } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  BedDouble,
  DollarSign,
  CalendarDays,
  ShieldAlert,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

interface MonthlyData {
  month: string;
  monthNum: number;
  occupancy: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  roomNights: number;
  availableNights: number;
}

function generateMonthlyData(
  reservations: Reservation[],
  rooms: Room[],
  year: number
): MonthlyData[] {
  const totalRooms = rooms.length || 1;
  const data: MonthlyData[] = [];

  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const availableNights = totalRooms * daysInMonth;

    // Count room nights sold in this month
    let roomNightsSold = 0;
    let totalRoomRevenue = 0;

    for (const res of reservations) {
      if (res.status === "cancelled" || res.status === "no-show") continue;

      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);

      // Calculate overlap days
      const overlapStart = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
      const overlapEnd = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
      const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));

      if (overlapDays > 0) {
        roomNightsSold += overlapDays;
        totalRoomRevenue += overlapDays * res.ratePerNight;
      }
    }

    const occupancy = availableNights > 0 ? Math.round((roomNightsSold / availableNights) * 100) : 0;
    const adr = roomNightsSold > 0 ? Math.round(totalRoomRevenue / roomNightsSold) : 0;
    const revpar = availableNights > 0 ? Math.round(totalRoomRevenue / availableNights) : 0;

    data.push({
      month: MONTHS_TR[m].substring(0, 3),
      monthNum: m + 1,
      occupancy: Math.min(occupancy, 100),
      adr,
      revpar,
      totalRevenue: Math.round(totalRoomRevenue),
      roomNights: roomNightsSold,
      availableNights,
    });
  }

  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-background p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {entry.name.includes("Oran") || entry.name.includes("Doluluk")
              ? `%${entry.value}`
              : entry.name.includes("Gelir") || entry.name.includes("ADR") || entry.name.includes("RevPAR")
                ? formatCurrency(entry.value)
                : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ManagerReportPage() {
  const { hasAccess } = useAuth();
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReservations(), getRoomsWithGuests()])
      .then(([res, rooms]) => {
        setAllReservations(res);
        setAllRooms(rooms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setDailyReports(getDailyReports());
  }, []);

  const monthlyData = useMemo(
    () => generateMonthlyData(allReservations, allRooms, selectedYear),
    [allReservations, allRooms, selectedYear]
  );

  // YTD KPIs
  const ytd = useMemo(() => {
    const totalRevenue = monthlyData.reduce((s, m) => s + m.totalRevenue, 0);
    const totalRoomNights = monthlyData.reduce((s, m) => s + m.roomNights, 0);
    const totalAvailable = monthlyData.reduce((s, m) => s + m.availableNights, 0);
    const avgOccupancy = totalAvailable > 0 ? Math.round((totalRoomNights / totalAvailable) * 100) : 0;
    const avgAdr = totalRoomNights > 0 ? Math.round(totalRevenue / totalRoomNights) : 0;
    const avgRevpar = totalAvailable > 0 ? Math.round(totalRevenue / totalAvailable) : 0;
    return { totalRevenue, totalRoomNights, totalAvailable, avgOccupancy, avgAdr, avgRevpar };
  }, [monthlyData]);

  if (!hasAccess("manager")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-bold">Erişim Engellendi</h2>
            <p className="text-sm text-muted-foreground text-center">
              Bu sayfaya erişmek için &quot;Müdür&quot; veya daha yüksek bir role sahip olmanız gerekiyor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const years = [2024, 2025, 2026];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manager Report</h1>
          <p className="text-[13px] text-muted-foreground">
            Aylık performans göstergeleri &middot; Occupancy, ADR, RevPAR
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csvRows = ["Ay,Doluluk %,ADR,RevPAR,Toplam Gelir,Satılan Gece"];
              monthlyData.forEach((m) => {
                csvRows.push(`${m.month},${m.occupancy},${m.adr},${m.revpar},${m.totalRevenue},${m.roomNights}`);
              });
              const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `manager-report-${selectedYear}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            CSV İndir
          </Button>
        </div>
      </div>

      {/* YTD KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Yıllık Doluluk</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{ytd.avgOccupancy}</div>
            <p className="text-xs text-muted-foreground">
              {ytd.totalRoomNights} gece / {ytd.totalAvailable} müsait
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ADR (Ort. Günlük Fiyat)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytd.avgAdr)}</div>
            <p className="text-xs text-muted-foreground">Yıllık ortalama</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytd.avgRevpar)}</div>
            <p className="text-xs text-muted-foreground">Oda başı gelir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Oda Geliri</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ytd.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{selectedYear} yılı toplamı</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble className="h-4 w-4" />
              Aylık Doluluk Oranı
            </CardTitle>
            <CardDescription>Occupancy % — {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `%${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="occupancy"
                  name="Doluluk Oranı"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorOcc)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ADR Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Aylık ADR (Ortalama Günlük Fiyat)
            </CardTitle>
            <CardDescription>Average Daily Rate — {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₺${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="adr"
                  name="ADR"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RevPAR Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Aylık RevPAR (Oda Başı Gelir)
            </CardTitle>
            <CardDescription>Revenue Per Available Room — {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevpar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₺${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revpar"
                  name="RevPAR"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#colorRevpar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Combined Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Karşılaştırmalı Performans
            </CardTitle>
            <CardDescription>Occupancy vs ADR vs RevPAR — {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `%${v}`} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `₺${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="occupancy" name="Doluluk %" fill="#3b82f6" opacity={0.3} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="adr" name="ADR" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="revpar" name="RevPAR" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aylık Detay Tablosu — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ay</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Satılan Gece</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Müsait Gece</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Doluluk</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ADR</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RevPAR</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Toplam Gelir</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => (
                <tr key={m.monthNum} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-medium">{MONTHS_TR[m.monthNum - 1]}</td>
                  <td className="px-4 py-2.5 text-right text-sm">{m.roomNights}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">{m.availableNights}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge
                      variant={m.occupancy >= 70 ? "default" : m.occupancy >= 40 ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      %{m.occupancy}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium">{formatCurrency(m.adr)}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-purple-600">{formatCurrency(m.revpar)}</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold">{formatCurrency(m.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td className="px-4 py-2.5 text-sm font-bold">TOPLAM</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold">{ytd.totalRoomNights}</td>
                <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">{ytd.totalAvailable}</td>
                <td className="px-4 py-2.5 text-right">
                  <Badge variant="default" className="text-[10px]">%{ytd.avgOccupancy}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold">{formatCurrency(ytd.avgAdr)}</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-purple-600">{formatCurrency(ytd.avgRevpar)}</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-primary">{formatCurrency(ytd.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Night Audit History */}
      {dailyReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Night Audit Geçmişi</CardTitle>
            <CardDescription>Son {dailyReports.length} gece denetimi</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tarih</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dolu Oda</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Doluluk</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Oda Geliri</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Varış</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ayrılış</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No-Show</th>
                </tr>
              </thead>
              <tbody>
                {dailyReports
                  .sort((a, b) => b.auditDate.localeCompare(a.auditDate))
                  .slice(0, 30)
                  .map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-sm font-medium">{r.auditDate}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{r.occupiedRooms}/{r.totalRooms}</td>
                      <td className="px-4 py-2.5 text-right text-sm">%{r.occupancyRate}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium">{formatCurrency(r.roomRevenue)}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{r.totalArrivals}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{r.totalDepartures}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{r.totalNoShows}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
