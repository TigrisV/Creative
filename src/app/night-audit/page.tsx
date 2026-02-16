"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getReservations, getRoomsWithGuests } from "@/lib/data-service";
import { markNoShows, postRoomCharges, updateDepartureRooms, saveDailyReport, getReportForDate, type DailyReport } from "@/lib/night-audit-service";
import type { Reservation, Room } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Moon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  BedDouble,
  CreditCard,
  Users,
  TrendingUp,
  FileText,
  ArrowRight,
  Loader2,
  XCircle,
  BarChart3,
} from "lucide-react";

interface AuditStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Moon;
  status: "pending" | "running" | "completed" | "warning" | "error";
  details?: string;
  count?: number;
}

const fmt = (d: Date) => d.toISOString().split("T")[0];

export default function NightAuditPage() {
  const today = useMemo(() => new Date(), []);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  useEffect(() => {
    getReservations().then(setAllReservations).catch(() => {});
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
  }, []);

  const inHouse = allReservations.filter((r) => r.status === "checked-in");
  const todayArrivals = allReservations.filter((r) => r.checkIn === fmt(today) && r.status === "confirmed");
  const todayDepartures = allReservations.filter((r) => r.checkOut === fmt(today) && r.status === "checked-in");
  const noShows = allReservations.filter((r) => r.checkIn === fmt(today) && r.status === "confirmed");
  const openBalances = allReservations.filter((r) => r.balance > 0 && r.status === "checked-in");
  const totalOpenBalance = openBalances.reduce((sum, r) => sum + r.balance, 0);
  const occupiedCount = allRooms.filter((r) => r.status === "occupied").length;
  const occupancyRate = allRooms.length ? Math.round((occupiedCount / allRooms.length) * 100) : 0;
  const todayRoomRevenue = inHouse.reduce((sum, r) => sum + r.ratePerNight, 0);

  const [steps, setSteps] = useState<AuditStep[]>([
    {
      id: "no-show",
      title: "No-Show Kontrolü",
      description: "Gelmeyen misafirlerin rezervasyonlarını no-show olarak işaretle",
      icon: XCircle,
      status: "pending",
      count: noShows.length,
    },
    {
      id: "post-charges",
      title: "Oda Ücretlerini Aktar",
      description: "Konaklamadaki tüm misafirlere gecelik oda ücreti aktar",
      icon: CreditCard,
      status: "pending",
      count: inHouse.length,
    },
    {
      id: "balance-check",
      title: "Bakiye Kontrolü",
      description: "Açık bakiyeleri kontrol et ve raporla",
      icon: AlertTriangle,
      status: "pending",
      count: openBalances.length,
    },
    {
      id: "room-status",
      title: "Oda Durumlarını Güncelle",
      description: "Checkout yapılan odaları kirli olarak işaretle",
      icon: BedDouble,
      status: "pending",
      count: todayDepartures.length,
    },
    {
      id: "occupancy",
      title: "Doluluk İstatistikleri",
      description: "Günlük doluluk oranı ve gelir hesapla",
      icon: BarChart3,
      status: "pending",
    },
    {
      id: "report",
      title: "Gece Raporu Oluştur",
      description: "Tüm gün sonu verilerini raporla ve kaydet",
      icon: FileText,
      status: "pending",
    },
  ]);

  const [auditReport, setAuditReport] = useState<DailyReport | null>(null);

  // Check if audit already ran today
  useEffect(() => {
    const existing = getReportForDate(fmt(today));
    if (existing) {
      setAuditReport(existing);
      setIsCompleted(true);
      setProgress(100);
      setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as const, details: "Daha önce tamamlandı" })));
    }
  }, [today]);

  const runAudit = async () => {
    setIsRunning(true);
    setIsCompleted(false);
    setCurrentStep(0);
    setProgress(0);

    const updatedSteps = [...steps];
    const advance = (i: number) => {
      setCurrentStep(i);
      updatedSteps[i].status = "running";
      setSteps([...updatedSteps]);
    };
    const complete = (i: number, details: string, warn = false) => {
      updatedSteps[i].status = warn ? "warning" : "completed";
      updatedSteps[i].details = details;
      setSteps([...updatedSteps]);
      setProgress(Math.round(((i + 1) / updatedSteps.length) * 100));
    };

    // Step 0: No-show
    advance(0);
    const noShowCount = await markNoShows(allReservations, today);
    complete(0, noShowCount > 0
      ? `${noShowCount} rezervasyon no-show olarak işaretlendi`
      : "No-show bulunmadı", noShowCount > 0);

    // Step 1: Post room charges to folios
    advance(1);
    const { count: chargesPosted, totalRevenue } = postRoomCharges(allReservations, today);
    complete(1, `${chargesPosted} odaya toplam ${formatCurrency(totalRevenue)} oda ücreti aktarıldı`);

    // Step 2: Balance check
    advance(2);
    const freshRes = await getReservations().catch(() => allReservations);
    const freshOpen = freshRes.filter((r) => r.balance > 0 && r.status === "checked-in");
    const freshOpenTotal = freshOpen.reduce((s, r) => s + r.balance, 0);
    complete(2, freshOpen.length > 0
      ? `${freshOpen.length} misafirin toplam ${formatCurrency(freshOpenTotal)} açık bakiyesi var`
      : "Açık bakiye yok", freshOpen.length > 0);

    // Step 3: Update departure rooms
    advance(3);
    const roomsUpdated = await updateDepartureRooms(allReservations, allRooms, today);
    complete(3, `${roomsUpdated} oda kirli olarak güncellendi`);

    // Step 4: Occupancy stats
    advance(4);
    complete(4, `Doluluk: %${occupancyRate} | ${occupiedCount}/${allRooms.length} oda dolu`);

    // Step 5: Save daily report
    advance(5);
    const report = saveDailyReport(allReservations, allRooms, today, totalRevenue, noShowCount, chargesPosted);
    setAuditReport(report);
    complete(5, "Günlük rapor kaydedildi");

    // Refresh data
    try {
      const freshRooms = await getRoomsWithGuests();
      const freshRes2 = await getReservations();
      setAllRooms(freshRooms);
      setAllReservations(freshRes2);
    } catch { /* keep existing data */ }

    setIsRunning(false);
    setIsCompleted(true);
  };

  const resetAudit = () => {
    setIsCompleted(false);
    setIsRunning(false);
    setCurrentStep(-1);
    setProgress(0);
    setSteps((prev) =>
      prev.map((s) => ({ ...s, status: "pending" as const, details: undefined }))
    );
  };

  const stepStatusIcon = (status: AuditStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground/40" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Night Audit</h1>
          <p className="text-[13px] text-muted-foreground">
            Gün sonu kapanışı &middot; {formatDate(fmt(today))}
          </p>
        </div>
        <div className="flex gap-2">
          {isCompleted && (
            <Button variant="outline" onClick={resetAudit}>Sıfırla</Button>
          )}
          <Button
            disabled={isRunning}
            onClick={runAudit}
            className={cn(isCompleted && "bg-emerald-600 hover:bg-emerald-700")}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Çalışıyor...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Tamamlandı
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Night Audit Başlat
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pre-Audit Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inHouse.length}</p>
              <p className="text-xs text-muted-foreground">Konaklamada</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
              <BedDouble className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">%{occupancyRate}</p>
              <p className="text-xs text-muted-foreground">Doluluk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(todayRoomRevenue)}</p>
              <p className="text-xs text-muted-foreground">Bugünkü Oda Geliri</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalOpenBalance > 0 ? "border-amber-300" : ""}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              totalOpenBalance > 0 ? "bg-amber-100 dark:bg-amber-900" : "bg-gray-100 dark:bg-gray-900"
            )}>
              <CreditCard className={cn("h-5 w-5", totalOpenBalance > 0 ? "text-amber-600" : "text-gray-600")} />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalOpenBalance)}</p>
              <p className="text-xs text-muted-foreground">Açık Bakiye ({openBalances.length})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {(isRunning || isCompleted) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {isCompleted ? "Night Audit tamamlandı" : `Adım ${currentStep + 1} / ${steps.length}`}
              </span>
              <span className="text-sm font-bold">%{progress}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Audit Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Audit Adımları
          </CardTitle>
          <CardDescription>Night Audit sırasında gerçekleştirilecek işlemler</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {steps.map((step, i) => {
            const StepIcon = step.icon;
            return (
              <div key={step.id}>
                <div
                  className={cn(
                    "flex items-center gap-4 rounded-lg p-3 transition-colors",
                    step.status === "running" && "bg-blue-50 dark:bg-blue-950/30",
                    step.status === "warning" && "bg-amber-50 dark:bg-amber-950/30",
                    step.status === "completed" && "bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <StepIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{step.title}</h4>
                      {step.count !== undefined && step.status === "pending" && (
                        <Badge variant="secondary" className="text-[10px]">{step.count}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {step.details && (
                      <p className={cn(
                        "mt-1 text-xs font-medium",
                        step.status === "warning" ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {step.details}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {stepStatusIcon(step.status)}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="ml-7 flex h-4 items-center">
                    <div className={cn(
                      "h-full w-px",
                      i < currentStep ? "bg-emerald-300" : "bg-border"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Post-Audit Report */}
      {isCompleted && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Night Audit Raporu — {formatDate(fmt(today))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Doluluk</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Toplam Oda</span>
                    <span className="font-medium">{allRooms.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dolu Oda</span>
                    <span className="font-medium">{occupiedCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Doluluk Oranı</span>
                    <span className="font-bold text-primary">%{occupancyRate}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Gelir</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Oda Geliri</span>
                    <span className="font-medium">{formatCurrency(todayRoomRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">F&B Geliri</span>
                    <span className="font-medium">{formatCurrency(2850)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diğer</span>
                    <span className="font-medium">{formatCurrency(480)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Toplam</span>
                    <span className="font-bold text-primary">{formatCurrency(todayRoomRevenue + 2850 + 480)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Hareketler</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Varışlar</span>
                    <span className="font-medium">{todayArrivals.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ayrılışlar</span>
                    <span className="font-medium">{todayDepartures.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">No-Show</span>
                    <span className={cn("font-medium", noShows.length > 0 && "text-amber-600")}>{noShows.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Açık Bakiye</span>
                    <span className={cn("font-medium", totalOpenBalance > 0 && "text-destructive")}>
                      {formatCurrency(totalOpenBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
