"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { SyncConflict, ConflictResolution, ChannelSource } from "@/lib/offline-sync";
import { RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Plus,
  ArrowRightLeft,
  Globe,
  Trash2,
  History,
  Zap,
  ShieldAlert,
  ArrowRight,
  Ban,
  Merge,
} from "lucide-react";

const channelLabels: Record<ChannelSource, string> = {
  booking: "Booking.com",
  expedia: "Expedia",
  agoda: "Agoda",
  direct: "Direkt",
  phone: "Telefon",
  walkin: "Walk-in",
};

const channelColors: Record<string, string> = {
  booking: "bg-blue-500",
  expedia: "bg-yellow-500",
  agoda: "bg-red-500",
  direct: "bg-emerald-500",
  phone: "bg-purple-500",
  walkin: "bg-gray-500",
};

const roomTypeLabels: Record<RoomType, string> = {
  standard: "Standart",
  deluxe: "Deluxe",
  suite: "Süit",
  family: "Aile",
  king: "King",
  twin: "Twin",
};

const syncStatusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Bekliyor", color: "text-amber-600 bg-amber-50", icon: Clock },
  syncing: { label: "Senkronize ediliyor", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  synced: { label: "Senkronize", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  conflict: { label: "Çakışma", color: "text-red-600 bg-red-50", icon: AlertTriangle },
  error: { label: "Hata", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function ChannelSyncPage() {
  const {
    isOnline,
    isSyncing,
    queue,
    conflicts,
    channelBuffer,
    syncLog,
    pendingCount,
    conflictCount,
    addReservation,
    removeReservation,
    triggerSync,
    resolveConflict,
    clearSynced,
    lastSyncResult,
  } = useOfflineSync();

  const [showNewForm, setShowNewForm] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "channels" | "conflicts" | "log">("queue");

  // New reservation form state
  const [formData, setFormData] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    roomType: "standard" as RoomType,
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    ratePerNight: 1800,
    source: "direct" as ChannelSource,
    specialRequests: "",
  });

  const handleAddReservation = () => {
    if (!formData.guestName || !formData.checkIn || !formData.checkOut) return;
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return;

    addReservation({
      ...formData,
      nights,
      totalAmount: nights * formData.ratePerNight,
    });

    setFormData({
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      roomType: "standard",
      checkIn: "",
      checkOut: "",
      adults: 1,
      children: 0,
      ratePerNight: 1800,
      source: "direct",
      specialRequests: "",
    });
    setShowNewForm(false);
  };

  const openConflictDialog = (conflict: SyncConflict) => {
    setActiveConflict(conflict);
    setShowConflictDialog(true);
  };

  const handleResolve = (resolution: ConflictResolution) => {
    if (!activeConflict) return;
    resolveConflict(activeConflict.id, resolution);
    setShowConflictDialog(false);
    setActiveConflict(null);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return d;
    }
  };

  const formatTime = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Kanal Senkronizasyonu</h1>
          <p className="text-[13px] text-muted-foreground">
            Çevrimdışı rezervasyonlar ve OTA kanal eşleştirmesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Online/Offline Status */}
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium",
            isOnline ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Çevrimiçi" : "Çevrimdışı"}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={triggerSync}
            disabled={isSyncing || !isOnline || pendingCount === 0}
          >
            {isSyncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Senkronize Et
          </Button>
          <Button size="sm" onClick={() => setShowNewForm(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Çevrimdışı Rezervasyon
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className={cn("cursor-pointer transition-all", activeTab === "queue" && "ring-2 ring-primary")} onClick={() => setActiveTab("queue")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{pendingCount}</p>
              <p className="text-[11px] text-muted-foreground">Bekleyen Senkron</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("cursor-pointer transition-all", activeTab === "channels" && "ring-2 ring-primary")} onClick={() => setActiveTab("channels")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{channelBuffer.length}</p>
              <p className="text-[11px] text-muted-foreground">Kanal Rezervasyonu</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("cursor-pointer transition-all", activeTab === "conflicts" && "ring-2 ring-primary")} onClick={() => setActiveTab("conflicts")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", conflictCount > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400")}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{conflictCount}</p>
              <p className="text-[11px] text-muted-foreground">Çakışma</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("cursor-pointer transition-all", activeTab === "log" && "ring-2 ring-primary")} onClick={() => setActiveTab("log")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold">{syncLog.length}</p>
              <p className="text-[11px] text-muted-foreground">İşlem Kaydı</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Result Banner */}
      {lastSyncResult && (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-[12px]">
            Son senkronizasyon ({formatTime(lastSyncResult.timestamp)}):
            <span className="ml-1.5 font-medium text-emerald-600">{lastSyncResult.synced} başarılı</span>
            {lastSyncResult.conflicts > 0 && (
              <span className="ml-1.5 font-medium text-amber-600">{lastSyncResult.conflicts} çakışma</span>
            )}
            {lastSyncResult.errors > 0 && (
              <span className="ml-1.5 font-medium text-red-600">{lastSyncResult.errors} hata</span>
            )}
          </span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "queue" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px]">Çevrimdışı Kuyruk ({queue.length})</CardTitle>
              {queue.some((r) => r.syncStatus === "synced") && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clearSynced}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  Senkronize edilenleri temizle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ArrowRightLeft className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Çevrimdışı kuyrukta rezervasyon yok</p>
                <p className="mt-1 text-[11px] text-muted-foreground">İnternet kesildiğinde alınan rezervasyonlar burada görünür</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasyon</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misafir</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda Tipi</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tarih</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kaynak</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Durum</th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((res) => {
                    const sc = syncStatusConfig[res.syncStatus];
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={res.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] font-medium text-primary">{res.confirmationNumber}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-[13px] font-medium">{res.guestName}</p>
                          <p className="text-[11px] text-muted-foreground">{res.guestPhone}</p>
                        </td>
                        <td className="px-3 py-2.5 text-[12px]">{roomTypeLabels[res.roomType]}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-[12px]">{formatDate(res.checkIn)} → {formatDate(res.checkOut)}</p>
                          <p className="text-[11px] text-muted-foreground">{res.nights} gece</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[10px]">{channelLabels[res.source]}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", sc.color)}>
                            <StatusIcon className={cn("h-3 w-3", res.syncStatus === "syncing" && "animate-spin")} />
                            {sc.label}
                          </div>
                          {res.errorMessage && (
                            <p className="mt-0.5 text-[10px] text-red-500">{res.errorMessage}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {res.syncStatus === "conflict" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => {
                                const c = conflicts.find((cf) => cf.id === res.conflictId);
                                if (c) openConflictDialog(c);
                              }}
                            >
                              Çöz
                            </Button>
                          )}
                          {(res.syncStatus === "pending" || res.syncStatus === "error") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                              onClick={() => removeReservation(res.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "channels" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px]">Kanal Rezervasyonları ({channelBuffer.length})</CardTitle>
            <CardDescription className="text-[12px]">Çevrimdışıyken OTA kanallarından gelen rezervasyonlar</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {channelBuffer.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Globe className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Kanal tamponunda rezervasyon yok</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kanal</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasyon</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misafir</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda Tipi</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tarih</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tutar</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Alınma</th>
                  </tr>
                </thead>
                <tbody>
                  {channelBuffer.map((ch) => (
                    <tr key={ch.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full", channelColors[ch.channel])} />
                          <span className="text-[12px] font-medium">{channelLabels[ch.channel]}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[12px] text-muted-foreground">{ch.channelConfirmation}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-medium">{ch.guestName}</p>
                        <p className="text-[11px] text-muted-foreground">{ch.guestEmail}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[12px]">{roomTypeLabels[ch.roomType]}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-[12px]">{formatDate(ch.checkIn)} → {formatDate(ch.checkOut)}</p>
                        <p className="text-[11px] text-muted-foreground">{ch.nights} gece</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-medium">₺{ch.totalAmount.toLocaleString("tr-TR")}</td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{formatDate(ch.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "conflicts" && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px]">Çakışmalar ({conflictCount})</CardTitle>
              <CardDescription className="text-[12px]">Çevrimdışı rezervasyonlarla kanal rezervasyonları arasındaki çakışmalar</CardDescription>
            </CardHeader>
          </Card>
          {conflicts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
                <p className="text-[13px] text-muted-foreground">Çözülmemiş çakışma yok</p>
              </CardContent>
            </Card>
          ) : (
            conflicts.map((conflict) => (
              <Card key={conflict.id} className={cn("border-l-4", conflict.severity === "high" ? "border-l-red-500" : "border-l-amber-500")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={conflict.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                          {conflict.severity === "high" ? "Yüksek Öncelik" : "Orta Öncelik"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {conflict.conflictType === "overbooking" ? "Overbooking" : "Tarih Çakışması"}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-muted-foreground">{conflict.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Local */}
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Lokal (Çevrimdışı)
                          </div>
                          <p className="text-[13px] font-medium">{conflict.localReservation.guestName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {roomTypeLabels[conflict.localReservation.roomType]} · {formatDate(conflict.localReservation.checkIn)} → {formatDate(conflict.localReservation.checkOut)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{conflict.localReservation.nights} gece · ₺{conflict.localReservation.totalAmount.toLocaleString("tr-TR")}</p>
                        </div>
                        {/* Channel */}
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                            <span className={cn("h-1.5 w-1.5 rounded-full", channelColors[conflict.channelReservation.channel])} />
                            {channelLabels[conflict.channelReservation.channel]}
                          </div>
                          <p className="text-[13px] font-medium">{conflict.channelReservation.guestName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {roomTypeLabels[conflict.channelReservation.roomType]} · {formatDate(conflict.channelReservation.checkIn)} → {formatDate(conflict.channelReservation.checkOut)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{conflict.channelReservation.nights} gece · ₺{conflict.channelReservation.totalAmount.toLocaleString("tr-TR")}</p>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openConflictDialog(conflict)}>
                      Çöz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "log" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px]">Senkronizasyon Geçmişi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {syncLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <History className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Henüz işlem kaydı yok</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {syncLog.map((log) => {
                  const actionConfig: Record<string, { color: string; icon: typeof Clock }> = {
                    "queued": { color: "text-amber-500", icon: Clock },
                    "sync-start": { color: "text-blue-500", icon: RefreshCw },
                    "sync-success": { color: "text-emerald-500", icon: CheckCircle2 },
                    "sync-fail": { color: "text-red-500", icon: XCircle },
                    "conflict-detected": { color: "text-red-500", icon: AlertTriangle },
                    "conflict-resolved": { color: "text-emerald-500", icon: CheckCircle2 },
                  };
                  const cfg = actionConfig[log.action] || actionConfig["queued"];
                  const LogIcon = cfg.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-3 border-b border-border/30 px-3 py-2.5">
                      <LogIcon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px]">{log.details}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Reservation Dialog */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Çevrimdışı Rezervasyon</DialogTitle>
            <DialogDescription className="text-[12px]">
              İnternet kesintisinde alınan rezervasyonu kaydedin. Bağlantı sağlandığında otomatik senkronize edilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium">Misafir Adı *</label>
              <Input
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Ad Soyad"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium">Telefon</label>
                <Input
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  placeholder="+90 5xx"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">E-posta</label>
                <Input
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  placeholder="email@"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium">Oda Tipi *</label>
                <Select value={formData.roomType} onValueChange={(v) => setFormData({ ...formData, roomType: v as RoomType })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roomTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] font-medium">Kaynak</label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v as ChannelSource })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(channelLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium">Giriş Tarihi *</label>
                <Input
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">Çıkış Tarihi *</label>
                <Input
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-medium">Yetişkin</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.adults}
                  onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">Çocuk</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.children}
                  onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium">Gecelik ₺</label>
                <Input
                  type="number"
                  value={formData.ratePerNight}
                  onChange={(e) => setFormData({ ...formData, ratePerNight: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium">Özel İstekler</label>
              <Input
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                placeholder="Varsa..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>İptal</Button>
            <Button
              size="sm"
              onClick={handleAddReservation}
              disabled={!formData.guestName || !formData.checkIn || !formData.checkOut}
            >
              Kuyruğa Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Çakışma Çözümü
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {activeConflict?.description}
            </DialogDescription>
          </DialogHeader>
          {activeConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-blue-600">LOKAL REZERVASYON</p>
                  <p className="text-[13px] font-semibold">{activeConflict.localReservation.guestName}</p>
                  <p className="text-[11px]">{roomTypeLabels[activeConflict.localReservation.roomType]}</p>
                  <p className="text-[11px]">{formatDate(activeConflict.localReservation.checkIn)} → {formatDate(activeConflict.localReservation.checkOut)}</p>
                  <p className="text-[11px] font-medium">₺{activeConflict.localReservation.totalAmount.toLocaleString("tr-TR")}</p>
                </div>
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-amber-600">KANAL: {channelLabels[activeConflict.channelReservation.channel].toUpperCase()}</p>
                  <p className="text-[13px] font-semibold">{activeConflict.channelReservation.guestName}</p>
                  <p className="text-[11px]">{roomTypeLabels[activeConflict.channelReservation.roomType]}</p>
                  <p className="text-[11px]">{formatDate(activeConflict.channelReservation.checkIn)} → {formatDate(activeConflict.channelReservation.checkOut)}</p>
                  <p className="text-[11px] font-medium">₺{activeConflict.channelReservation.totalAmount.toLocaleString("tr-TR")}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-[12px] font-medium">Nasıl çözmek istersiniz?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                    onClick={() => handleResolve("keep-local")}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[12px] font-semibold">Lokali Koru</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Çevrimdışı kaydı koru, kanal kaydını iptal et</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                    onClick={() => handleResolve("keep-remote")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[12px] font-semibold">Kanalı Koru</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Kanal kaydını koru, lokal kaydı iptal et</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                    onClick={() => handleResolve("merge")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Merge className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[12px] font-semibold">Birleştir</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Her ikisini de farklı odalara ata</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col items-start gap-1 p-3 text-left"
                    onClick={() => handleResolve("dismiss")}
                  >
                    <div className="flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-[12px] font-semibold">Ertele</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Sonra tekrar değerlendir</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
