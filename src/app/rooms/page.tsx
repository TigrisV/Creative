"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getRoomsWithGuests, updateRoom } from "@/lib/data-service";
import { getHousekeepingTasks } from "@/lib/staff-service";
import { cn, formatCurrency } from "@/lib/utils";
import type { Room, RoomStatus, HousekeepingTaskFull } from "@/lib/types";
import {
  BedDouble,
  Search,
  Filter,
  Grid3X3,
  List,
  Wifi,
  Tv,
  Wind,
  Bath,
  Users,
  MessageSquare,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  Star,
  CreditCard,
  Building2,
  Sparkles,
  Wrench,
  CheckCircle2,
} from "lucide-react";

const statusConfig: Record<RoomStatus, { label: string; color: string; badgeVariant: string }> = {
  "vacant-clean": { label: "Boş / Temiz", color: "bg-emerald-500", badgeVariant: "success" },
  "vacant-dirty": { label: "Boş / Kirli", color: "bg-amber-500", badgeVariant: "warning" },
  occupied: { label: "Dolu", color: "bg-blue-500", badgeVariant: "info" },
  "out-of-order": { label: "Arızalı", color: "bg-gray-500", badgeVariant: "maintenance" },
  maintenance: { label: "Bakımda", color: "bg-red-500", badgeVariant: "destructive" },
};

const typeLabels: Record<string, string> = {
  standard: "Standart",
  deluxe: "Deluxe",
  suite: "Süit",
  family: "Aile",
  king: "King",
  twin: "Twin",
};

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [hkTasks, setHkTasks] = useState<HousekeepingTaskFull[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [data, tasks] = await Promise.all([getRoomsWithGuests(), getHousekeepingTasks()]);
      setRooms(data);
      setHkTasks(tasks);
    } catch (err) {
      console.error("Odalar yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getRoomTask = (roomNumber: string) =>
    hkTasks.find((t) => t.roomNumber === roomNumber && t.status !== "inspected");

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.number.includes(searchTerm) ||
      (room.currentGuest && `${room.currentGuest.firstName} ${room.currentGuest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFloor = filterFloor === "all" || room.floor.toString() === filterFloor;
    const matchesStatus = filterStatus === "all" || room.status === filterStatus;
    const matchesType = filterType === "all" || room.type === filterType;
    return matchesSearch && matchesFloor && matchesStatus && matchesType;
  });

  const floors = [...new Set(rooms.map((r) => r.floor))].sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oda Yönetimi</h1>
          <p className="text-[13px] text-muted-foreground">Toplam {rooms.length} oda &middot; {rooms.filter(r => r.status === "occupied").length} dolu</p>
        </div>
        <Button onClick={() => router.push('/settings')}>Yeni Oda Ekle</Button>
      </div>

      {/* Status Summary Bar */}
      <div className="flex gap-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = rooms.filter((r) => r.status === status).length;
          return (
            <div
              key={status}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer transition-all",
                filterStatus === status ? "ring-2 ring-primary" : "hover:bg-accent"
              )}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            >
              <div className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
              <span className="text-sm font-medium">{config.label}</span>
              <span className="text-sm font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Oda no veya misafir ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Kat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Katlar</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={f.toString()}>Kat {f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Oda Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {Object.entries(typeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Room Grid */}
      {viewMode === "grid" ? (
        <div className="space-y-6">
          {floors.map((floor) => {
            const floorRooms = filteredRooms.filter((r) => r.floor === floor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">KAT {floor}</h3>
                <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {floorRooms.map((room) => {
                    const config = statusConfig[room.status];
                    return (
                      <Card
                        key={room.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          room.status === "occupied" && "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                        )}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-lg font-bold">{room.number}</p>
                              <p className="text-xs text-muted-foreground">{typeLabels[room.type] || room.type}</p>
                            </div>
                            <div className={cn("h-3 w-3 rounded-full", config.color)} />
                          </div>
                          <div className="mt-3">
                            <Badge variant={config.badgeVariant as any} className="text-[10px]">
                              {config.label}
                            </Badge>
                          </div>
                          {room.currentGuest && (
                            <div className="mt-2 space-y-0.5 rounded bg-white/60 p-2 dark:bg-black/20">
                              <p className="text-xs font-semibold">
                                {room.currentGuest.firstName} {room.currentGuest.lastName}
                                {room.currentGuest.vipLevel && room.currentGuest.vipLevel > 0 && (
                                  <Star className="inline ml-1 h-3 w-3 text-amber-500 fill-amber-500" />
                                )}
                              </p>
                              {room.currentGuest.phone && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />{room.currentGuest.phone}
                                </p>
                              )}
                              {room.currentGuest.nationality && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Globe className="h-2.5 w-2.5" />{room.currentGuest.nationality}
                                </p>
                              )}
                            </div>
                          )}
                          {(() => {
                            const task = getRoomTask(room.number);
                            if (!task) return null;
                            const hasIssue = task.issuesFound;
                            const hasNote = task.notes;
                            if (!hasIssue && !hasNote) return null;
                            return (
                              <div className={cn("mt-2 rounded p-1.5 flex items-start gap-1", hasIssue ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30")}>
                                {hasIssue ? <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" /> : <MessageSquare className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />}
                                <p className={cn("text-[10px] line-clamp-2", hasIssue ? "text-red-700" : "text-amber-700")}>
                                  {hasIssue || hasNote}
                                </p>
                              </div>
                            );
                          })()}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              <Users className="mr-1 inline h-3 w-3" />
                              {room.maxOccupancy}
                            </span>
                            <span className="text-xs font-medium">{formatCurrency(room.baseRate)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kat</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tip</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Durum</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misafir</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kapasite</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const config = statusConfig[room.status];
                  return (
                    <tr key={room.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedRoom(room)}>
                      <td className="px-4 py-3 text-sm font-bold">{room.number}</td>
                      <td className="px-4 py-3 text-sm">{room.floor}</td>
                      <td className="px-4 py-3 text-sm">{typeLabels[room.type]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={config.badgeVariant as any} className="text-[10px]">
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {room.currentGuest ? (
                          <div>
                            <p className="text-sm font-medium">
                              {room.currentGuest.firstName} {room.currentGuest.lastName}
                              {room.currentGuest.vipLevel && room.currentGuest.vipLevel > 0 && (
                                <Star className="inline ml-1 h-3 w-3 text-amber-500 fill-amber-500" />
                              )}
                            </p>
                            {room.currentGuest.phone && (
                              <p className="text-[11px] text-muted-foreground">{room.currentGuest.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{room.maxOccupancy}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(room.baseRate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Room Detail Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="max-w-sm">
          {selectedRoom && (() => {
            const config = statusConfig[selectedRoom.status];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[16px] flex items-center gap-2">
                    <BedDouble className="h-5 w-5" />
                    Oda {selectedRoom.number}
                  </DialogTitle>
                  <DialogDescription className="text-[12px]">
                    Kat {selectedRoom.floor} · {typeLabels[selectedRoom.type]}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Durum</span>
                    <Badge variant={config.badgeVariant as any} className="text-[10px]">{config.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Kapasite</span>
                    <span className="text-[13px] font-medium">{selectedRoom.maxOccupancy} kişi</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Gecelik Fiyat</span>
                    <span className="text-[13px] font-semibold">{formatCurrency(selectedRoom.baseRate)}</span>
                  </div>
                  {selectedRoom.currentGuest && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Mevcut Misafir</p>
                        <p className="text-[13px] font-semibold">
                          {selectedRoom.currentGuest.firstName} {selectedRoom.currentGuest.lastName}
                          {selectedRoom.currentGuest.vipLevel && selectedRoom.currentGuest.vipLevel > 0 && (
                            <Badge variant="warning" className="ml-2 text-[9px]">VIP {selectedRoom.currentGuest.vipLevel}</Badge>
                          )}
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {selectedRoom.currentGuest.phone && (
                            <div className="flex items-center gap-2 text-[12px]">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{selectedRoom.currentGuest.phone}</span>
                            </div>
                          )}
                          {selectedRoom.currentGuest.email && (
                            <div className="flex items-center gap-2 text-[12px]">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{selectedRoom.currentGuest.email}</span>
                            </div>
                          )}
                          {selectedRoom.currentGuest.nationality && (
                            <div className="flex items-center gap-2 text-[12px]">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span>{selectedRoom.currentGuest.nationality}</span>
                            </div>
                          )}
                          {selectedRoom.currentGuest.idNumber && (
                            <div className="flex items-center gap-2 text-[12px]">
                              <CreditCard className="h-3 w-3 text-muted-foreground" />
                              <span>{selectedRoom.currentGuest.idNumber}</span>
                            </div>
                          )}
                          {selectedRoom.currentGuest.companyName && (
                            <div className="flex items-center gap-2 text-[12px]">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{selectedRoom.currentGuest.companyName}</span>
                            </div>
                          )}
                          {selectedRoom.currentGuest.notes && (
                            <p className="text-[11px] text-muted-foreground italic mt-1">{selectedRoom.currentGuest.notes}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {(() => {
                    const task = getRoomTask(selectedRoom.number);
                    if (!task || (!task.issuesFound && !task.notes)) return null;
                    return (
                      <>
                        <Separator />
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Housekeeping Notu</p>
                          {task.issuesFound && (
                            <div className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[11px] font-medium text-red-700">Sorun Bildirimi</p>
                                <p className="text-[11px] text-red-600">{task.issuesFound}</p>
                              </div>
                            </div>
                          )}
                          {task.notes && (
                            <div className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2">
                              <MessageSquare className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] text-amber-700">{task.notes}</p>
                            </div>
                          )}
                          {task.assignedToName && (
                            <p className="text-[10px] text-muted-foreground mt-1">Personel: {task.assignedToName}</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {/* Status Change Buttons */}
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase mb-2">Durum Değiştir</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.status === "vacant-dirty" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={async () => {
                            await updateRoom(selectedRoom.id, { status: "vacant-clean", housekeepingStatus: "clean" });
                            setSelectedRoom(null);
                            loadData();
                          }}
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Temiz Yap
                        </Button>
                      )}
                      {selectedRoom.status === "vacant-clean" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={async () => {
                            await updateRoom(selectedRoom.id, { status: "out-of-order" });
                            setSelectedRoom(null);
                            loadData();
                          }}
                        >
                          <Wrench className="mr-1 h-3 w-3" />
                          Arızalı İşaretle
                        </Button>
                      )}
                      {selectedRoom.status === "out-of-order" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={async () => {
                            await updateRoom(selectedRoom.id, { status: "vacant-clean", housekeepingStatus: "clean" });
                            setSelectedRoom(null);
                            loadData();
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Kullanıma Aç
                        </Button>
                      )}
                      {selectedRoom.status === "maintenance" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={async () => {
                            await updateRoom(selectedRoom.id, { status: "vacant-dirty", housekeepingStatus: "dirty" });
                            setSelectedRoom(null);
                            loadData();
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Bakım Tamamlandı
                        </Button>
                      )}
                    </div>
                  </div>
                  {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Olanaklar</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRoom.amenities.map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
