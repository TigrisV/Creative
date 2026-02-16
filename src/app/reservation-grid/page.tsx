"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput, isPhoneValid, isEmailValid, formatFullPhone } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getReservations, getRoomsWithGuests, updateReservation, updateRoom, setRoomGuest, clearRoomGuest, createReservation } from "@/lib/data-service";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Reservation, Room } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  GripHorizontal,
  User,
  Phone,
  Mail,
  Globe,
  Star,
  CreditCard,
  BedDouble,
  CalendarDays,
  Plus,
  FileText,
  LogIn,
  ArrowRightLeft,
} from "lucide-react";

const CELL_WIDTH = 120;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 60;
const ROOM_COL_WIDTH = 130;

const roomTypeLabels: Record<string, string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  suite: "Suite",
  family: "Family",
  king: "King",
  twin: "Twin",
};

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-500 hover:bg-blue-600",
  "checked-in": "bg-emerald-500 hover:bg-emerald-600",
  "checked-out": "bg-gray-400 hover:bg-gray-500",
  pending: "bg-amber-500 hover:bg-amber-600",
  cancelled: "bg-red-400 hover:bg-red-500",
  "no-show": "bg-orange-400 hover:bg-orange-500",
};

const statusLabels: Record<string, string> = {
  confirmed: "Onaylı",
  "checked-in": "Konaklıyor",
  "checked-out": "Çıkış Yaptı",
  pending: "Beklemede",
  cancelled: "İptal",
  "no-show": "Gelmedi",
};

function getDaysArray(startDate: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatDayName(d: Date): string {
  return d.toLocaleDateString("tr-TR", { weekday: "short" });
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function diffDays(d1: Date, d2: Date): number {
  const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

interface GridReservation {
  reservation: Reservation;
  roomNumber: string;
  startOffset: number;
  spanDays: number;
}

interface NewResForm {
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  source: string;
  specialRequests: string;
}

export default function ReservationGridPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
    getReservations().then(setAllReservations).catch(() => {});
  }, []);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    return d;
  });
  const [visibleDays, setVisibleDays] = useState(14);
  const [dragItem, setDragItem] = useState<GridReservation | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Modals
  const [guestModalRes, setGuestModalRes] = useState<Reservation | null>(null);
  const [newResModal, setNewResModal] = useState(false);
  const [newResForm, setNewResForm] = useState<NewResForm>({
    roomNumber: "",
    roomType: "",
    checkIn: "",
    checkOut: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    adults: 1,
    children: 0,
    source: "direct",
    specialRequests: "",
  });
  const [gridPhoneCountry, setGridPhoneCountry] = useState("TR");
  const [gridEmailTouched, setGridEmailTouched] = useState(false);
  const gridPhoneOk = newResForm.guestPhone ? isPhoneValid(newResForm.guestPhone, gridPhoneCountry) : true;
  const gridEmailOk = newResForm.guestEmail ? isEmailValid(newResForm.guestEmail) : true;

  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => getDaysArray(startDate, visibleDays), [startDate, visibleDays]);

  const gridRooms = useMemo(() => {
    const sortedRooms = [...allRooms].sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.number.localeCompare(b.number);
    });
    return sortedRooms.slice(0, 30);
  }, [allRooms]);

  const gridReservations = useMemo<GridReservation[]>(() => {
    const result: GridReservation[] = [];
    const gridStart = days[0];
    const gridEnd = days[days.length - 1];

    for (const res of allReservations) {
      if (res.status === "cancelled") continue;

      const roomNumber = res.room?.number;
      if (!roomNumber) continue;

      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);

      if (checkOut < gridStart || checkIn > gridEnd) continue;

      const startOffset = Math.max(0, diffDays(gridStart, checkIn));
      const endOffset = Math.min(visibleDays, diffDays(gridStart, checkOut));
      const spanDays = endOffset - startOffset;

      if (spanDays > 0) {
        result.push({ reservation: res, roomNumber, startOffset, spanDays });
      }
    }
    return result;
  }, [days, visibleDays, allReservations]);

  const navigate = useCallback((direction: number) => {
    setStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 3);
    setStartDate(d);
  }, []);

  const zoomIn = useCallback(() => {
    setVisibleDays((prev) => Math.max(7, prev - 7));
  }, []);

  const zoomOut = useCallback(() => {
    setVisibleDays((prev) => Math.min(31, prev + 7));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, gridRes: GridReservation) => {
    setDragItem(gridRes);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", gridRes.reservation.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, roomNumber: string, dayIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverRoom(roomNumber);
    setDragOverDay(dayIndex);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverRoom(null);
    setDragOverDay(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, roomNumber: string, _dayIndex: number) => {
    e.preventDefault();
    if (dragItem && roomNumber !== dragItem.roomNumber) {
      const res = dragItem.reservation;
      const targetRoom = allRooms.find((r) => r.number === roomNumber);
      if (!targetRoom) return;

      // Update reservation room
      await updateReservation(res.id, { room: targetRoom }).catch(() => {});
      // Update old room to vacant
      const oldRoom = allRooms.find((r) => r.number === dragItem.roomNumber);
      if (oldRoom) {
        await updateRoom(oldRoom.id, { status: "vacant-dirty", housekeepingStatus: "dirty" }).catch(() => {});
        clearRoomGuest(dragItem.roomNumber);
      }
      // Update new room to occupied
      await updateRoom(targetRoom.id, { status: "occupied" }).catch(() => {});
      if (res.guest) setRoomGuest(roomNumber, res.guest);

      // Refresh data
      const [freshRooms, freshRes] = await Promise.all([getRoomsWithGuests(), getReservations()]);
      setAllRooms(freshRooms);
      setAllReservations(freshRes);
    }
    setDragItem(null);
    setDragOverRoom(null);
    setDragOverDay(null);
  }, [dragItem, allRooms]);

  // ─── Check-in handler ───────────────────────────────────────────────
  const handleCheckIn = useCallback(async (res: Reservation) => {
    await updateReservation(res.id, { status: "checked-in" }).catch(() => {});
    if (res.room) {
      await updateRoom(res.room.id, { status: "occupied" }).catch(() => {});
      if (res.guest) setRoomGuest(res.room.number, res.guest);
    }
    // Refresh
    const [freshRooms, freshRes] = await Promise.all([getRoomsWithGuests(), getReservations()]);
    setAllRooms(freshRooms);
    setAllReservations(freshRes);
    setGuestModalRes(null);
  }, []);

  // ─── Room Move handler (dropdown) ──────────────────────────────────
  const handleRoomMove = useCallback(async (res: Reservation, newRoomNumber: string) => {
    const targetRoom = allRooms.find((r) => r.number === newRoomNumber);
    if (!targetRoom) return;
    // Update reservation
    await updateReservation(res.id, { room: targetRoom }).catch(() => {});
    // Old room → dirty + clear guest
    if (res.room) {
      await updateRoom(res.room.id, { status: "vacant-dirty", housekeepingStatus: "dirty" }).catch(() => {});
      clearRoomGuest(res.room.number);
    }
    // New room → occupied
    await updateRoom(targetRoom.id, { status: "occupied" }).catch(() => {});
    if (res.guest) setRoomGuest(newRoomNumber, res.guest);
    // Refresh
    const [freshRooms, freshRes] = await Promise.all([getRoomsWithGuests(), getReservations()]);
    setAllRooms(freshRooms);
    setAllReservations(freshRes);
    setGuestModalRes(null);
  }, [allRooms]);

  // Boş hücreye tıklama — yeni rezervasyon formu aç
  const handleEmptyCellClick = useCallback((room: Room, dayIdx: number) => {
    const clickedDate = days[dayIdx];
    const nextDay = new Date(clickedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    setNewResForm({
      roomNumber: room.number,
      roomType: room.type,
      checkIn: toISODate(clickedDate),
      checkOut: toISODate(nextDay),
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      adults: 1,
      children: 0,
      source: "direct",
      specialRequests: "",
    });
    setNewResModal(true);
  }, [days]);

  // Hücrede rezervasyon var mı kontrolü
  const isCellOccupied = useCallback((roomNumber: string, dayIdx: number): boolean => {
    return gridReservations.some(
      (gr) => gr.roomNumber === roomNumber && dayIdx >= gr.startOffset && dayIdx < gr.startOffset + gr.spanDays
    );
  }, [gridReservations]);

  const floors = Array.from(new Set(gridRooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Rezervasyon Takvimi</h1>
          <p className="text-[13px] text-muted-foreground">
            İnteraktif takvim görünümü &middot; {gridRooms.length} oda &middot; {visibleDays} gün
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="mr-2 h-4 w-4" />
            Bugün
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex items-center gap-1 rounded-lg border p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("h-3 w-6 rounded-sm", color.split(" ")[0])} />
            <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <Plus className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Boş hücreye tıklayarak yeni rezervasyon oluştur</span>
        </div>
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]" ref={scrollRef}>
            <div
              style={{
                minWidth: ROOM_COL_WIDTH + CELL_WIDTH * visibleDays,
                position: "relative",
              }}
            >
              {/* Header Row - Dates */}
              <div
                className="sticky top-0 z-20 flex border-b bg-background"
                style={{ height: HEADER_HEIGHT }}
              >
                <div
                  className="sticky left-0 z-30 flex flex-col items-start justify-center border-r bg-muted/80 px-3 backdrop-blur"
                  style={{ width: ROOM_COL_WIDTH, minWidth: ROOM_COL_WIDTH }}
                >
                  <span className="text-xs font-bold">ODA</span>
                  <span className="text-[9px] text-muted-foreground">Numara / Tip</span>
                </div>
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center justify-center border-r text-center",
                      isToday(day) && "bg-primary/10",
                      isWeekend(day) && "bg-orange-50/50 dark:bg-orange-950/20"
                    )}
                    style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                  >
                    <span className={cn(
                      "text-[10px] uppercase",
                      isToday(day) ? "font-bold text-primary" : "text-muted-foreground"
                    )}>
                      {formatDayName(day)}
                    </span>
                    <span className={cn(
                      "text-sm",
                      isToday(day) ? "font-bold text-primary" : "font-medium"
                    )}>
                      {formatShortDate(day)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Room Rows */}
              {floors.map((floor) => {
                const floorRooms = gridRooms.filter((r) => r.floor === floor);
                return (
                  <React.Fragment key={floor}>
                    {/* Floor Header */}
                    <div className="flex border-b bg-muted/40" style={{ height: 28 }}>
                      <div
                        className="sticky left-0 z-10 flex items-center bg-muted/60 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur"
                        style={{ width: ROOM_COL_WIDTH, minWidth: ROOM_COL_WIDTH }}
                      >
                        Kat {floor}
                      </div>
                      <div style={{ flex: 1 }} />
                    </div>

                    {floorRooms.map((room) => {
                      const roomReservations = gridReservations.filter(
                        (gr) => gr.roomNumber === room.number
                      );

                      return (
                        <div
                          key={room.id}
                          className="group flex border-b hover:bg-muted/20"
                          style={{ height: ROW_HEIGHT, position: "relative" }}
                        >
                          {/* Room Label — Numara + Kategori */}
                          <div
                            className="sticky left-0 z-10 flex items-center gap-2 border-r bg-background px-3 backdrop-blur group-hover:bg-muted/30"
                            style={{ width: ROOM_COL_WIDTH, minWidth: ROOM_COL_WIDTH }}
                          >
                            <span className="text-sm font-bold">{room.number}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {roomTypeLabels[room.type] || room.type}
                            </Badge>
                          </div>

                          {/* Day Cells */}
                          <div className="relative flex" style={{ flex: 1 }}>
                            {days.map((day, dayIdx) => {
                              const occupied = isCellOccupied(room.number, dayIdx);
                              return (
                                <div
                                  key={dayIdx}
                                  className={cn(
                                    "border-r transition-colors",
                                    isToday(day) && "bg-primary/5",
                                    isWeekend(day) && "bg-orange-50/30 dark:bg-orange-950/10",
                                    dragOverRoom === room.number && dragOverDay === dayIdx && "bg-blue-100 dark:bg-blue-900/30",
                                    !occupied && "cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  )}
                                  style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, height: ROW_HEIGHT }}
                                  onClick={() => {
                                    if (!occupied) handleEmptyCellClick(room, dayIdx);
                                  }}
                                  onDragOver={(e) => handleDragOver(e, room.number, dayIdx)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, room.number, dayIdx)}
                                />
                              );
                            })}

                            {/* Reservation Bars */}
                            {roomReservations.map((gr) => {
                              const left = gr.startOffset * CELL_WIDTH;
                              const width = gr.spanDays * CELL_WIDTH - 4;
                              const colorClass = statusColors[gr.reservation.status] || "bg-gray-400";

                              return (
                                <div
                                  key={gr.reservation.id}
                                  className={cn(
                                    "absolute flex cursor-grab items-center gap-1 rounded px-2 text-white shadow-sm transition-shadow active:cursor-grabbing active:shadow-md",
                                    colorClass
                                  )}
                                  style={{
                                    left: left + 2,
                                    top: 6,
                                    width: Math.max(width, 30),
                                    height: ROW_HEIGHT - 12,
                                    zIndex: 5,
                                  }}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, gr)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGuestModalRes(gr.reservation);
                                  }}
                                  title={`${gr.reservation.guest.firstName} ${gr.reservation.guest.lastName}\n${gr.reservation.confirmationNumber}\n${gr.reservation.checkIn} → ${gr.reservation.checkOut}`}
                                >
                                  <GripHorizontal className="h-3 w-3 shrink-0 opacity-60" />
                                  <span className="truncate text-[11px] font-medium">
                                    {gr.reservation.guest.lastName}
                                  </span>
                                  {gr.spanDays > 2 && (
                                    <span className="ml-auto truncate text-[9px] opacity-80">
                                      {gr.reservation.confirmationNumber.slice(-4)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =============================================
          MODAL 1: Misafir Bilgileri (Bloğa Tıklayınca)
          ============================================= */}
      <Dialog open={!!guestModalRes} onOpenChange={(open) => !open && setGuestModalRes(null)}>
        <DialogContent className="max-w-2xl">
          {guestModalRes && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {guestModalRes.guest.firstName} {guestModalRes.guest.lastName}
                  {(guestModalRes.guest.vipLevel ?? 0) > 0 && (
                    <Badge className="bg-amber-500 text-white text-[10px] ml-1">
                      <Star className="mr-1 h-3 w-3" />
                      VIP {guestModalRes.guest.vipLevel}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Konfirmasyon: {guestModalRes.confirmationNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Misafir İletişim */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">E-posta</p>
                      <p className="text-sm">{guestModalRes.guest.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Telefon</p>
                      <p className="text-sm">{guestModalRes.guest.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Ülke / Şehir</p>
                      <p className="text-sm">{guestModalRes.guest.city}, {guestModalRes.guest.country}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Rezervasyon Detayları */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Rezervasyon Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground">Giriş</p>
                      <p className="text-sm font-semibold">{formatDate(guestModalRes.checkIn)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground">Çıkış</p>
                      <p className="text-sm font-semibold">{formatDate(guestModalRes.checkOut)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground">Oda / Tip</p>
                      <p className="text-sm font-semibold">
                        {guestModalRes.room?.number || "—"} / {roomTypeLabels[guestModalRes.roomType]}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] text-muted-foreground">Gece / Kişi</p>
                      <p className="text-sm font-semibold">
                        {guestModalRes.nights} gece &middot; {guestModalRes.adults} yetişkin
                        {guestModalRes.children > 0 && `, ${guestModalRes.children} çocuk`}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Ödeme Bilgileri */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Ödeme Bilgileri
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Toplam</p>
                      <p className="text-lg font-bold">{formatCurrency(guestModalRes.totalAmount)}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Ödenen</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(guestModalRes.paidAmount)}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3 text-center", guestModalRes.balance > 0 && "border-amber-300 bg-amber-50 dark:bg-amber-950/20")}>
                      <p className="text-[10px] text-muted-foreground">Bakiye</p>
                      <p className={cn("text-lg font-bold", guestModalRes.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                        {formatCurrency(guestModalRes.balance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Durum + Kaynak */}
                <div className="flex items-center gap-3">
                  <Badge className={cn("text-white", (statusColors[guestModalRes.status] || "bg-gray-400").split(" ")[0])}>
                    {statusLabels[guestModalRes.status]}
                  </Badge>
                  <Badge variant="outline">{guestModalRes.source}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Toplam konaklama: {guestModalRes.guest.totalStays} | Harcama: {formatCurrency(guestModalRes.guest.totalSpent)}
                  </span>
                </div>

                {/* Özel İstekler */}
                {guestModalRes.specialRequests && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Özel İstekler</p>
                    <p className="text-sm">{guestModalRes.specialRequests}</p>
                  </div>
                )}
              </div>

              {/* Oda Değiştirme */}
              {guestModalRes.status === "checked-in" && (
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Oda Değiştir:</span>
                  <Select onValueChange={(v) => handleRoomMove(guestModalRes, v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Oda seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allRooms
                        .filter((r) => r.status === "vacant-clean")
                        .map((r) => (
                          <SelectItem key={r.id} value={r.number}>
                            {r.number} — {roomTypeLabels[r.type] || r.type}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setGuestModalRes(null)}>Kapat</Button>
                {guestModalRes.status === "confirmed" && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleCheckIn(guestModalRes)}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Check-in Yap
                  </Button>
                )}
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Folio Görüntüle
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =============================================
          MODAL 2: Yeni Rezervasyon (Boş Hücreye Tıklayınca)
          ============================================= */}
      <Dialog open={newResModal} onOpenChange={setNewResModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Rezervasyon
            </DialogTitle>
            <DialogDescription>
              Oda {newResForm.roomNumber} ({roomTypeLabels[newResForm.roomType] || newResForm.roomType}) &middot; {newResForm.checkIn ? formatDate(newResForm.checkIn) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tarihler */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Giriş Tarihi</label>
                <Input
                  type="date"
                  value={newResForm.checkIn}
                  onChange={(e) => setNewResForm((p) => ({ ...p, checkIn: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Çıkış Tarihi</label>
                <Input
                  type="date"
                  value={newResForm.checkOut}
                  onChange={(e) => setNewResForm((p) => ({ ...p, checkOut: e.target.value }))}
                />
              </div>
            </div>

            {/* Misafir Bilgileri */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Misafir Adı Soyadı</label>
              <Input
                placeholder="Adı Soyadı"
                value={newResForm.guestName}
                onChange={(e) => setNewResForm((p) => ({ ...p, guestName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-posta</label>
                <Input
                  placeholder="ornek@email.com"
                  className={gridEmailTouched && newResForm.guestEmail && !gridEmailOk ? "border-destructive" : gridEmailTouched && newResForm.guestEmail && gridEmailOk ? "border-emerald-500" : ""}
                  value={newResForm.guestEmail}
                  onChange={(e) => setNewResForm((p) => ({ ...p, guestEmail: e.target.value }))}
                  onBlur={() => setGridEmailTouched(true)}
                />
                {gridEmailTouched && newResForm.guestEmail && !gridEmailOk && (
                  <p className="mt-1 text-[10px] text-destructive">Geçersiz e-posta</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Telefon</label>
                <PhoneInput
                  value={newResForm.guestPhone}
                  onChange={(v) => setNewResForm((p) => ({ ...p, guestPhone: v }))}
                  countryCode={gridPhoneCountry}
                  onCountryChange={setGridPhoneCountry}
                />
                {newResForm.guestPhone && !gridPhoneOk && (
                  <p className="mt-1 text-[10px] text-destructive">Numara eksik</p>
                )}
              </div>
            </div>

            {/* Kişi sayısı */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Yetişkin</label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={newResForm.adults}
                  onChange={(e) => setNewResForm((p) => ({ ...p, adults: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Çocuk</label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={newResForm.children}
                  onChange={(e) => setNewResForm((p) => ({ ...p, children: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kaynak</label>
                <Select
                  value={newResForm.source}
                  onValueChange={(v) => setNewResForm((p) => ({ ...p, source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direkt</SelectItem>
                    <SelectItem value="booking">Booking.com</SelectItem>
                    <SelectItem value="expedia">Expedia</SelectItem>
                    <SelectItem value="phone">Telefon</SelectItem>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Özel İstekler */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Özel İstekler</label>
              <Input
                placeholder="Erken check-in, deniz manzarası vb."
                value={newResForm.specialRequests}
                onChange={(e) => setNewResForm((p) => ({ ...p, specialRequests: e.target.value }))}
              />
            </div>

            {/* Oda/Fiyat Özet */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Oda</span>
                <span className="font-medium">{newResForm.roomNumber} — {roomTypeLabels[newResForm.roomType]}</span>
              </div>
              {newResForm.checkIn && newResForm.checkOut && (
                <>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Gece</span>
                    <span className="font-medium">
                      {Math.max(1, diffDays(new Date(newResForm.checkIn), new Date(newResForm.checkOut)))} gece
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Tahmini Tutar</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(
                        Math.max(1, diffDays(new Date(newResForm.checkIn), new Date(newResForm.checkOut))) *
                        (allRooms.find((r) => r.number === newResForm.roomNumber)?.baseRate || 0)
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewResModal(false)}>İptal</Button>
            <Button
              disabled={!newResForm.guestName.trim() || !newResForm.checkIn || !newResForm.checkOut || (!!newResForm.guestPhone && !gridPhoneOk) || (!!newResForm.guestEmail && !gridEmailOk)}
              onClick={async () => {
                const nameParts = newResForm.guestName.trim().split(/\s+/);
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";
                const nights = diffDays(new Date(newResForm.checkIn), new Date(newResForm.checkOut));
                const room = allRooms.find((r) => r.number === newResForm.roomNumber);
                const ratePerNight = room ? (room.type === "suite" ? 4500 : room.type === "deluxe" ? 2500 : room.type === "king" ? 3000 : room.type === "family" ? 3500 : 1500) : 1500;
                const totalAmount = ratePerNight * Math.max(nights, 1);
                const newRes: Reservation = {
                  id: crypto.randomUUID(),
                  confirmationNumber: "CR-" + Date.now().toString(36).toUpperCase(),
                  guest: { id: crypto.randomUUID(), firstName, lastName, email: newResForm.guestEmail, phone: newResForm.guestPhone ? formatFullPhone(newResForm.guestPhone, gridPhoneCountry) : "", idNumber: "", nationality: "TR", vipLevel: 0, totalStays: 0, totalSpent: 0, createdAt: new Date().toISOString() },
                  room,
                  roomType: (newResForm.roomType || "standard") as Reservation["roomType"],
                  checkIn: newResForm.checkIn,
                  checkOut: newResForm.checkOut,
                  nights: Math.max(nights, 1),
                  adults: newResForm.adults,
                  children: newResForm.children,
                  status: "confirmed",
                  ratePerNight,
                  totalAmount,
                  paidAmount: 0,
                  balance: totalAmount,
                  source: newResForm.source,
                  specialRequests: newResForm.specialRequests || undefined,
                  createdAt: new Date().toISOString(),
                };
                await createReservation(newRes).catch(() => {});
                const [freshRooms, freshRes] = await Promise.all([getRoomsWithGuests(), getReservations()]);
                setAllRooms(freshRooms);
                setAllReservations(freshRes);
                setNewResModal(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Rezervasyon Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
