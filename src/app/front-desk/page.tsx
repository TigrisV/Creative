"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getReservations, getRooms, getRoomsWithGuests, updateReservation, updateRoom, setRoomGuest, clearRoomGuest } from "@/lib/data-service";
import { createHousekeepingTask, getBarOrdersByRoom, markBarOrdersPaid } from "@/lib/staff-service";
import { createNotification } from "@/lib/notification-service";
import { printCheckInReceipt, printCheckOutInvoice } from "@/lib/print-utils";
import type { BarOrder, Reservation, Room } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  LogIn,
  LogOut,
  Search,
  User,
  CreditCard,
  Key,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  BedDouble,
  Banknote,
  DoorOpen,
  Printer,
  Star,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Loader2,
  KeyRound,
  Sparkles,
  Receipt,
  MessageSquare,
  X,
  Upload,
  Camera,
  ImageIcon,
  Trash2,
  ZoomIn,
} from "lucide-react";

// ─── Step types ──────────────────────────────────────────────────────
type CheckInStep = "verify" | "id-check" | "room-assign" | "payment" | "keycard" | "done";
type CheckOutStep = "folio" | "payment" | "keycard" | "feedback" | "done";

const ciSteps: { key: CheckInStep; label: string; icon: typeof FileText }[] = [
  { key: "verify", label: "Rezervasyon", icon: FileText },
  { key: "id-check", label: "Kimlik", icon: ShieldCheck },
  { key: "room-assign", label: "Oda Atama", icon: BedDouble },
  { key: "payment", label: "Ödeme", icon: Banknote },
  { key: "keycard", label: "Anahtar Kart", icon: KeyRound },
  { key: "done", label: "Tamamlandı", icon: CheckCircle2 },
];

const coSteps: { key: CheckOutStep; label: string; icon: typeof FileText }[] = [
  { key: "folio", label: "Folio Özeti", icon: Receipt },
  { key: "payment", label: "Son Ödeme", icon: Banknote },
  { key: "keycard", label: "Anahtar İade", icon: KeyRound },
  { key: "feedback", label: "Değerlendirme", icon: Star },
  { key: "done", label: "Tamamlandı", icon: CheckCircle2 },
];

const roomTypeLabels: Record<string, string> = {
  standard: "Standart", deluxe: "Deluxe", suite: "Süit",
  family: "Aile", king: "King", twin: "Twin",
};

const paymentMethods = [
  { value: "credit-card", label: "Kredi Kartı", icon: CreditCard },
  { value: "cash", label: "Nakit", icon: Banknote },
  { value: "bank-transfer", label: "Havale / EFT", icon: Receipt },
];

// ─── Stepper (defined outside to avoid re-mount) ─────────────────────
function Stepper({ steps, current }: { steps: { key: string; label: string; icon: React.ElementType }[]; current: string }) {
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-4">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = i < currentIdx;
        const isActive = step.key === current;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={cn("h-0.5 flex-1 rounded", isDone ? "bg-primary" : "bg-muted")} />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                isDone ? "border-primary bg-primary text-white" :
                isActive ? "border-primary bg-primary/10 text-primary" :
                "border-muted bg-muted/30 text-muted-foreground"
              )}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={cn(
                "text-[9px] font-medium whitespace-nowrap",
                isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
              )}>{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FrontDeskContent() {
  // Client-only date to avoid hydration mismatch
  const [today, setToday] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    setMounted(true);
  }, []);

  // Mutable reservation & room state
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  const searchParams = useSearchParams();
  const checkinId = searchParams.get("checkin");
  const checkoutId = searchParams.get("checkout");
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    getReservations().then(setAllReservations).catch(() => {});
    getRoomsWithGuests().then(setAllRooms).catch(() => {});
  }, []);

  const arrivals = allReservations.filter((r) => r.checkIn === today && r.status === "confirmed");
  const departures = allReservations.filter((r) => r.checkOut === today && r.status === "checked-in");
  const inHouse = allReservations.filter((r) => r.status === "checked-in");

  const [searchTerm, setSearchTerm] = useState("");
  const filteredInHouse = inHouse.filter((r) =>
    searchTerm === "" ||
    `${r.guest.firstName} ${r.guest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.room?.number.includes(searchTerm)
  );

  // ─── Check-in state ────────────────────────────────────────────────
  const [ciOpen, setCiOpen] = useState(false);
  const [ciRes, setCiRes] = useState<Reservation | null>(null);
  const [ciStep, setCiStep] = useState<CheckInStep>("verify");
  const [ciIdVerified, setCiIdVerified] = useState(false);
  const [ciSelectedRoom, setCiSelectedRoom] = useState("");
  const [ciPaymentMethod, setCiPaymentMethod] = useState("credit-card");
  const [ciPaymentAmount, setCiPaymentAmount] = useState("");
  const [ciDepositAmount, setCiDepositAmount] = useState("");
  const [ciKeycardCount, setCiKeycardCount] = useState("2");
  const [ciProcessing, setCiProcessing] = useState(false);
  const [ciNotes, setCiNotes] = useState("");
  const [ciScannedDocs, setCiScannedDocs] = useState<{ name: string; url: string; type: string }[]>([]);
  const [ciDragOver, setCiDragOver] = useState(false);
  const [ciDocPreview, setCiDocPreview] = useState<string | null>(null);
  const [ciScanProcessing, setCiScanProcessing] = useState(false);
  const [ciDocType, setCiDocType] = useState<"tc-kimlik" | "passport" | "ehliyet" | "other">("tc-kimlik");

  // ─── Check-out state ───────────────────────────────────────────────
  const [coOpen, setCoOpen] = useState(false);
  const [coRes, setCoRes] = useState<Reservation | null>(null);
  const [coStep, setCoStep] = useState<CheckOutStep>("folio");
  const [coPaymentMethod, setCoPaymentMethod] = useState("credit-card");
  const [coPaymentAmount, setCoPaymentAmount] = useState("");
  const [coKeycardReturned, setCoKeycardReturned] = useState(false);
  const [coRating, setCoRating] = useState(0);
  const [coFeedback, setCoFeedback] = useState("");
  const [coProcessing, setCoProcessing] = useState(false);
  const [coMinibarCharges, setCoMinibarCharges] = useState("");
  const [coRoomClean, setCoRoomClean] = useState(false);
  const [coBarOrders, setCoBarOrders] = useState<BarOrder[]>([]);
  const [coBarTotal, setCoBarTotal] = useState(0);

  // ─── Available rooms for check-in ──────────────────────────────────
  const availableRooms = useMemo(() => {
    if (!ciRes) return [];
    return allRooms.filter(
      (r) => r.status === "vacant-clean" && r.type === ciRes.roomType
    );
  }, [ciRes, allRooms]);

  const allAvailableClean = allRooms.filter((r) => r.status === "vacant-clean");

  // ─── Check-in handlers ─────────────────────────────────────────────
  const openCheckIn = (res: Reservation) => {
    setCiRes(res);
    setCiStep("verify");
    setCiIdVerified(false);
    setCiSelectedRoom(res.room?.number || "");
    setCiPaymentMethod("credit-card");
    setCiPaymentAmount(res.balance > 0 ? res.balance.toString() : "");
    setCiDepositAmount("");
    setCiKeycardCount("2");
    setCiNotes("");
    setCiScannedDocs([]);
    setCiDragOver(false);
    setCiDocPreview(null);
    setCiDocType("tc-kimlik");
    setCiOpen(true);
  };

  const ciNext = () => {
    const idx = ciSteps.findIndex((s) => s.key === ciStep);
    if (idx < ciSteps.length - 1) setCiStep(ciSteps[idx + 1].key);
  };
  const ciPrev = () => {
    const idx = ciSteps.findIndex((s) => s.key === ciStep);
    if (idx > 0) setCiStep(ciSteps[idx - 1].key);
  };

  const completeCheckIn = async () => {
    if (!ciRes) return;
    setCiProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));

    const paidNow = parseFloat(ciPaymentAmount) || 0;
    const deposit = parseFloat(ciDepositAmount) || 0;
    const assignedRoom = allRooms.find((r) => r.number === ciSelectedRoom);

    // Update reservation
    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === ciRes.id
          ? {
              ...r,
              status: "checked-in" as const,
              room: assignedRoom || r.room,
              paidAmount: r.paidAmount + paidNow + deposit,
              balance: Math.max(0, r.balance - paidNow),
            }
          : r
      )
    );

    // Update room status
    if (assignedRoom) {
      setAllRooms((prev) =>
        prev.map((rm) =>
          rm.number === ciSelectedRoom
            ? { ...rm, status: "occupied" as const, currentGuest: ciRes.guest }
            : rm
        )
      );
      updateRoom(assignedRoom.id, { status: "occupied" }).catch(() => {});
      setRoomGuest(ciSelectedRoom, ciRes.guest);
    }

    // Persist to DB (room bilgisi dahil)
    updateReservation(ciRes.id, {
      status: "checked-in",
      room: assignedRoom || undefined,
      paidAmount: ciRes.paidAmount + paidNow + deposit,
      balance: Math.max(0, ciRes.balance - paidNow),
    }).catch(() => {});

    setCiProcessing(false);
    setCiStep("done");
  };

  // ─── Check-out handlers ────────────────────────────────────────────
  const openCheckOut = async (res: Reservation) => {
    setCoRes(res);
    setCoStep("folio");
    setCoPaymentMethod("credit-card");
    setCoKeycardReturned(false);
    setCoRating(0);
    setCoFeedback("");
    setCoMinibarCharges("");
    setCoRoomClean(false);
    // Load delivered bar orders for this room
    let barOrders: BarOrder[] = [];
    let barTotal = 0;
    if (res.room?.number) {
      try {
        const allOrders = await getBarOrdersByRoom(res.room.number);
        barOrders = allOrders.filter((o) => o.status === "delivered");
        barTotal = barOrders.reduce((s, o) => s + o.totalAmount, 0);
      } catch { /* ignore */ }
    }
    setCoBarOrders(barOrders);
    setCoBarTotal(barTotal);
    setCoPaymentAmount((res.balance + barTotal) > 0 ? (res.balance + barTotal).toString() : "");
    setCoOpen(true);
  };

  // Auto-open check-in/check-out dialog from query params (e.g. from reservations page)
  useEffect(() => {
    if (autoOpenedRef.current || allReservations.length === 0) return;
    if (checkinId) {
      const res = allReservations.find((r) => r.id === checkinId && r.status === "confirmed");
      if (res) { autoOpenedRef.current = true; openCheckIn(res); }
    } else if (checkoutId) {
      const res = allReservations.find((r) => r.id === checkoutId && r.status === "checked-in");
      if (res) { autoOpenedRef.current = true; openCheckOut(res); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReservations, checkinId, checkoutId]);

  const coNext = () => {
    const idx = coSteps.findIndex((s) => s.key === coStep);
    if (idx < coSteps.length - 1) setCoStep(coSteps[idx + 1].key);
  };
  const coPrev = () => {
    const idx = coSteps.findIndex((s) => s.key === coStep);
    if (idx > 0) setCoStep(coSteps[idx - 1].key);
  };

  const completeCheckOut = async () => {
    if (!coRes) return;
    setCoProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));

    const paidNow = parseFloat(coPaymentAmount) || 0;
    const minibar = parseFloat(coMinibarCharges) || 0;
    const extraCharges = minibar + coBarTotal;
    const roomNum = coRes.room?.number;

    // Update reservation
    setAllReservations((prev) =>
      prev.map((r) =>
        r.id === coRes.id
          ? {
              ...r,
              status: "checked-out" as const,
              totalAmount: r.totalAmount + extraCharges,
              paidAmount: r.paidAmount + paidNow,
              balance: Math.max(0, r.balance + extraCharges - paidNow),
            }
          : r
      )
    );

    // Update room status
    if (roomNum) {
      const room = allRooms.find((rm) => rm.number === roomNum);
      setAllRooms((prev) =>
        prev.map((rm) =>
          rm.number === roomNum
            ? { ...rm, status: "vacant-dirty" as const, housekeepingStatus: "dirty" as const, currentGuest: undefined }
            : rm
        )
      );
      if (room) {
        updateRoom(room.id, { status: "vacant-dirty", housekeepingStatus: "dirty" }).catch(() => {});
      }
      clearRoomGuest(roomNum);
    }

    // Persist to DB
    updateReservation(coRes.id, {
      status: "checked-out",
      totalAmount: coRes.totalAmount + extraCharges,
      paidAmount: coRes.paidAmount + paidNow,
      balance: Math.max(0, coRes.balance + extraCharges - paidNow),
    }).catch(() => {});

    // Mark bar orders as paid
    if (roomNum && coBarOrders.length > 0) {
      markBarOrdersPaid(roomNum).catch(() => {});
    }

    // Auto-create housekeeping task for the room
    if (roomNum) {
      const room = allRooms.find((rm) => rm.number === roomNum);
      createHousekeepingTask({
        roomNumber: roomNum,
        floor: room?.floor || 1,
        taskType: "checkout",
        status: "pending",
        priority: "medium",
        notes: `Check-out: ${coRes.guest.firstName} ${coRes.guest.lastName}`,
      }).catch(() => {});
    }

    setCoProcessing(false);
    setCoStep("done");
  };

  // ─── Folio items for checkout ──────────────────────────────────────
  const buildFolioItems = (res: Reservation) => {
    const items = [];
    for (let i = 0; i < res.nights; i++) {
      items.push({ desc: `Oda Ücreti - ${roomTypeLabels[res.roomType] || res.roomType} (Gece ${i + 1})`, amount: res.ratePerNight });
    }
    if (res.totalAmount > res.ratePerNight * res.nights) {
      items.push({ desc: "Ekstra Hizmetler", amount: res.totalAmount - res.ratePerNight * res.nights });
    }
    // Teslim edilen bar siparişleri
    if (coBarOrders.length > 0) {
      for (const bo of coBarOrders) {
        const itemNames = bo.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
        const deliveredTime = bo.deliveredAt ? new Date(bo.deliveredAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
        const timeStr = deliveredTime ? ` (${deliveredTime})` : "";
        items.push({ desc: `🍸 Bar — ${itemNames}${timeStr}`, amount: bo.totalAmount });
      }
    }
    if (res.paidAmount > 0) {
      items.push({ desc: "Önceki Ödemeler", amount: -res.paidAmount });
    }
    return items;
  };

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Resepsiyon</h1>
          <p className="text-[13px] text-muted-foreground">Check-in, Check-out ve misafir işlemleri</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Resepsiyon</h1>
        <p className="text-[13px] text-muted-foreground">Check-in, Check-out ve misafir işlemleri</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <LogIn className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{arrivals.length}</p>
              <p className="text-[11px] text-muted-foreground">Beklenen Varış</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <LogOut className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{departures.length}</p>
              <p className="text-[11px] text-muted-foreground">Beklenen Çıkış</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{inHouse.length}</p>
              <p className="text-[11px] text-muted-foreground">Konaklamada</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Key className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{allAvailableClean.length}</p>
              <p className="text-[11px] text-muted-foreground">Müsait Oda</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="arrivals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="arrivals">
            <LogIn className="mr-1.5 h-3.5 w-3.5" />
            Varışlar ({arrivals.length})
          </TabsTrigger>
          <TabsTrigger value="departures">
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Ayrılışlar ({departures.length})
          </TabsTrigger>
          <TabsTrigger value="inhouse">
            <User className="mr-1.5 h-3.5 w-3.5" />
            Konaklamada ({inHouse.length})
          </TabsTrigger>
        </TabsList>

        {/* Arrivals Tab */}
        <TabsContent value="arrivals" className="space-y-3">
          {arrivals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Bugün beklenen varış bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            arrivals.map((res) => (
              <Card key={res.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-[14px] font-bold text-primary">
                        {res.guest.firstName[0]}{res.guest.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-semibold">{res.guest.firstName} {res.guest.lastName}</h3>
                          {res.guest.vipLevel && (
                            <Badge variant="warning" className="text-[9px] h-4"><Star className="mr-0.5 h-2.5 w-2.5" /> VIP {res.guest.vipLevel}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {res.confirmationNumber} · {roomTypeLabels[res.roomType] || res.roomType} · {res.nights} gece · {res.adults} yetişkin
                          {res.children > 0 ? `, ${res.children} çocuk` : ""}
                        </p>
                        {res.specialRequests && (
                          <p className="mt-0.5 text-[10px] text-amber-600">
                            <AlertCircle className="mr-0.5 inline h-3 w-3" />
                            {res.specialRequests}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[13px] font-semibold">{formatCurrency(res.totalAmount)}</p>
                        {res.balance > 0 && (
                          <p className="text-[10px] text-destructive">Bakiye: {formatCurrency(res.balance)}</p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => openCheckIn(res)}>
                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                        Check-in
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Departures Tab */}
        <TabsContent value="departures" className="space-y-3">
          {departures.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Bugün beklenen ayrılış bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            departures.map((res) => (
              <Card key={res.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-[14px] font-bold text-orange-700">
                        {res.guest.firstName[0]}{res.guest.lastName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-semibold">{res.guest.firstName} {res.guest.lastName}</h3>
                          {res.guest.vipLevel && (
                            <Badge variant="warning" className="text-[9px] h-4"><Star className="mr-0.5 h-2.5 w-2.5" /> VIP</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Oda {res.room?.number || "—"} · {res.confirmationNumber} · {res.nights} gece
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[13px] font-semibold">{formatCurrency(res.totalAmount)}</p>
                        {res.balance > 0 ? (
                          <p className="text-[10px] text-destructive">Bakiye: {formatCurrency(res.balance)}</p>
                        ) : (
                          <p className="text-[10px] text-emerald-600">Ödendi</p>
                        )}
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => openCheckOut(res)}>
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                        Check-out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* In-House Tab */}
        <TabsContent value="inhouse" className="space-y-3">
          {inHouse.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">Şu an konaklamada misafir yok</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Misafir adı veya oda no ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misafir</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Giriş</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Çıkış</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bakiye</th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInHouse.map((res) => (
                        <tr key={res.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5">
                            <p className="text-[13px] font-medium">{res.guest.firstName} {res.guest.lastName}</p>
                            <p className="text-[11px] text-muted-foreground">{res.confirmationNumber}</p>
                          </td>
                          <td className="px-3 py-2.5 text-[13px] font-bold">{res.room?.number || "—"}</td>
                          <td className="px-3 py-2.5 text-[13px]">{formatDate(res.checkIn)}</td>
                          <td className="px-3 py-2.5 text-[13px]">{formatDate(res.checkOut)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={res.balance > 0 ? "text-[13px] font-medium text-destructive" : "text-[13px] text-emerald-600"}>
                              {formatCurrency(res.balance)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => openCheckOut(res)}>
                              <LogOut className="mr-1 h-3 w-3" /> Check-out
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CHECK-IN DIALOG                                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={ciOpen} onOpenChange={(open) => { if (!open) setCiOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {ciRes && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[15px]">
                  <LogIn className="h-4 w-4 text-blue-600" />
                  Check-in: {ciRes.guest.firstName} {ciRes.guest.lastName}
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  {ciRes.confirmationNumber} · {roomTypeLabels[ciRes.roomType]} · {ciRes.nights} gece
                </DialogDescription>
              </DialogHeader>

              <Stepper steps={ciSteps} current={ciStep} />

              {/* Step 1: Verify Reservation */}
              {ciStep === "verify" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Misafir" value={`${ciRes.guest.firstName} ${ciRes.guest.lastName}`} />
                        <InfoItem label="Telefon" value={ciRes.guest.phone} />
                        <InfoItem label="E-posta" value={ciRes.guest.email} />
                        <InfoItem label="Uyruk" value={ciRes.guest.nationality} />
                        <InfoItem label="Giriş" value={formatDate(ciRes.checkIn)} />
                        <InfoItem label="Çıkış" value={formatDate(ciRes.checkOut)} />
                        <InfoItem label="Gece" value={`${ciRes.nights}`} />
                        <InfoItem label="Kişi" value={`${ciRes.adults} yetişkin${ciRes.children > 0 ? `, ${ciRes.children} çocuk` : ""}`} />
                        <InfoItem label="Oda Tipi" value={roomTypeLabels[ciRes.roomType] || ciRes.roomType} />
                        <InfoItem label="Kaynak" value={ciRes.source} />
                        <InfoItem label="Toplam" value={formatCurrency(ciRes.totalAmount)} />
                        <InfoItem label="Bakiye" value={formatCurrency(ciRes.balance)} highlight={ciRes.balance > 0} />
                      </div>
                      {ciRes.specialRequests && (
                        <div className="rounded-md bg-amber-50 px-2 py-1.5">
                          <p className="text-[10px] font-medium text-amber-700">Özel İstekler:</p>
                          <p className="text-[11px] text-amber-600">{ciRes.specialRequests}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={ciNext}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: ID Check */}
              {ciStep === "id-check" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Kimlik Doğrulama</p>
                          <p className="text-[11px] text-muted-foreground">Misafirin kimliğini kontrol edin</p>
                        </div>
                      </div>
                      <Separator />
                      {ciRes.guest.idDocument ? (
                        <div className="grid grid-cols-2 gap-2">
                          <InfoItem label="Belge Tipi" value={ciRes.guest.idDocument.type === "tc-kimlik" ? "T.C. Kimlik" : ciRes.guest.idDocument.type === "passport" ? "Pasaport" : ciRes.guest.idDocument.type} />
                          <InfoItem label="Numara" value={ciRes.guest.idDocument.number} />
                          {ciRes.guest.idDocument.issuedBy && <InfoItem label="Veren Kurum" value={ciRes.guest.idDocument.issuedBy} />}
                          {ciRes.guest.idDocument.expiryDate && <InfoItem label="Son Geçerlilik" value={formatDate(ciRes.guest.idDocument.expiryDate)} />}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <InfoItem label="Kimlik No" value={ciRes.guest.idNumber} />
                          <InfoItem label="Uyruk" value={ciRes.guest.nationality} />
                        </div>
                      )}

                      <Separator />

                      {/* Document Type Selection */}
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Belge Tipi</p>
                        <div className="flex gap-1.5">
                          {[
                            { value: "tc-kimlik" as const, label: "T.C. Kimlik" },
                            { value: "passport" as const, label: "Pasaport" },
                            { value: "ehliyet" as const, label: "Ehliyet" },
                            { value: "other" as const, label: "Diğer" },
                          ].map((dt) => (
                            <button
                              type="button"
                              key={dt.value}
                              onClick={() => setCiDocType(dt.value)}
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all",
                                ciDocType === dt.value
                                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                  : "border-border hover:border-primary/30"
                              )}
                            >
                              {dt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Document Upload / Scan Area */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setCiDragOver(true); }}
                        onDragLeave={() => setCiDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCiDragOver(false);
                          const files = Array.from(e.dataTransfer.files).filter((f) =>
                            f.type.startsWith("image/") || f.type === "application/pdf"
                          );
                          if (files.length > 0) {
                            setCiScanProcessing(true);
                            files.forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setCiScannedDocs((prev) => [
                                  ...prev,
                                  { name: file.name, url: ev.target?.result as string, type: file.type },
                                ]);
                                setCiScanProcessing(false);
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all cursor-pointer",
                          ciDragOver
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setCiScanProcessing(true);
                              files.forEach((file) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setCiScannedDocs((prev) => [
                                    ...prev,
                                    { name: file.name, url: ev.target?.result as string, type: file.type },
                                  ]);
                                  setCiScanProcessing(false);
                                };
                                reader.readAsDataURL(file);
                              });
                            }
                            e.target.value = "";
                          }}
                        />
                        {ciScanProcessing ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin text-primary mb-1.5" />
                            <p className="text-[12px] font-medium text-primary">Belge işleniyor...</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Upload className="h-5 w-5 text-muted-foreground" />
                              <Camera className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-[12px] font-medium">Kimlik / Pasaport Tara veya Yükle</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Sürükle-bırak veya tıklayarak dosya seçin · JPG, PNG, PDF
                            </p>
                          </>
                        )}
                      </div>

                      {/* Scanned Documents Preview */}
                      {ciScannedDocs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Taranan Belgeler ({ciScannedDocs.length})
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {ciScannedDocs.map((doc, idx) => (
                              <div
                                key={idx}
                                className="group relative rounded-lg border border-border/60 overflow-hidden bg-muted/20"
                              >
                                {doc.type.startsWith("image/") ? (
                                  <img
                                    src={doc.url}
                                    alt={doc.name}
                                    className="h-24 w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-24 items-center justify-center bg-muted/30">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="p-1.5">
                                  <p className="text-[10px] font-medium truncate">{doc.name}</p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {ciDocType === "tc-kimlik" ? "T.C. Kimlik" : ciDocType === "passport" ? "Pasaport" : ciDocType === "ehliyet" ? "Ehliyet" : "Diğer Belge"}
                                  </p>
                                </div>
                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {doc.type.startsWith("image/") && (
                                    <button
                                      type="button"
                                      onClick={() => setCiDocPreview(doc.url)}
                                      className="flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                                    >
                                      <ZoomIn className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setCiScannedDocs((prev) => prev.filter((_, i) => i !== idx))}
                                    className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/80 text-white hover:bg-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCiIdVerified(!ciIdVerified)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                            ciIdVerified ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                          )}
                        >
                          {ciIdVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span className="text-[12px] font-medium">Kimlik belgesi kontrol edildi ve doğrulandı</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Preview Modal */}
                  {ciDocPreview && (
                    <div
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
                      onClick={() => setCiDocPreview(null)}
                    >
                      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                        <img src={ciDocPreview} alt="Belge" className="max-h-[85vh] rounded-lg shadow-2xl" />
                        <button
                          type="button"
                          onClick={() => setCiDocPreview(null)}
                          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card border shadow-lg text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={ciPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={ciNext} disabled={!ciIdVerified}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Room Assignment */}
              {ciStep === "room-assign" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <BedDouble className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Oda Atama</p>
                          <p className="text-[11px] text-muted-foreground">
                            {roomTypeLabels[ciRes.roomType]} tipinde {availableRooms.length} müsait oda var
                          </p>
                        </div>
                      </div>
                      <Select value={ciSelectedRoom} onValueChange={setCiSelectedRoom}>
                        <SelectTrigger><SelectValue placeholder="Oda seçin..." /></SelectTrigger>
                        <SelectContent>
                          {availableRooms.length > 0 ? (
                            availableRooms.map((rm) => (
                              <SelectItem key={rm.number} value={rm.number}>
                                Oda {rm.number} · Kat {rm.floor} · {roomTypeLabels[rm.type]} · ₺{rm.baseRate}/gece
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>Bu tipte müsait oda yok</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {/* Dirty room warning */}
                      {(() => {
                        const dirtyCount = allRooms.filter((r) => r.status === "vacant-dirty").length;
                        if (dirtyCount === 0) return null;
                        return (
                          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            <AlertCircle className="mr-1 inline h-3 w-3 text-amber-600" />
                            <strong>{dirtyCount} oda kirli (Dirty)</strong> durumda ve check-in için uygun değil.
                            Housekeeping tarafından temizlenmesi gerekiyor.
                          </div>
                        );
                      })()}
                      {availableRooms.length === 0 && allAvailableClean.length > 0 && (
                        <>
                          <p className="text-[11px] text-amber-600">
                            <AlertCircle className="mr-0.5 inline h-3 w-3" />
                            Bu tipte müsait oda yok. Aşağıdan farklı tipte oda seçebilirsiniz:
                          </p>
                          <Select value={ciSelectedRoom} onValueChange={setCiSelectedRoom}>
                            <SelectTrigger><SelectValue placeholder="Alternatif oda seçin..." /></SelectTrigger>
                            <SelectContent>
                              {allAvailableClean.map((rm) => (
                                <SelectItem key={rm.number} value={rm.number}>
                                  Oda {rm.number} · Kat {rm.floor} · {roomTypeLabels[rm.type]} · ₺{rm.baseRate}/gece
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Check-in Notu</label>
                        <Input
                          value={ciNotes}
                          onChange={(e) => setCiNotes(e.target.value)}
                          placeholder="Opsiyonel not..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={ciPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={ciNext} disabled={!ciSelectedRoom}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {ciStep === "payment" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Ödeme & Depozito</p>
                          <p className="text-[11px] text-muted-foreground">
                            Toplam: {formatCurrency(ciRes.totalAmount)} · Ödenen: {formatCurrency(ciRes.paidAmount)} · Bakiye: {formatCurrency(ciRes.balance)}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <label className="text-[11px] font-medium">Ödeme Yöntemi</label>
                        <div className="mt-1.5 flex gap-2">
                          {paymentMethods.map((pm) => {
                            const PMIcon = pm.icon;
                            return (
                              <button
                                type="button"
                                key={pm.value}
                                onClick={() => setCiPaymentMethod(pm.value)}
                                className={cn(
                                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border p-2.5 text-[11px] font-medium transition-all",
                                  ciPaymentMethod === pm.value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "hover:border-primary/30"
                                )}
                              >
                                <PMIcon className="h-3.5 w-3.5" /> {pm.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {ciRes.balance > 0 && (
                        <div>
                          <label className="text-[11px] font-medium">Şimdi Alınacak Ödeme (₺)</label>
                          <Input
                            type="number"
                            value={ciPaymentAmount}
                            onChange={(e) => setCiPaymentAmount(e.target.value)}
                            placeholder={ciRes.balance.toString()}
                            className="mt-1"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[11px] font-medium">Depozito / Güvence Bedeli (₺)</label>
                        <Input
                          type="number"
                          value={ciDepositAmount}
                          onChange={(e) => setCiDepositAmount(e.target.value)}
                          placeholder="500"
                          className="mt-1"
                        />
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Minibar, hasar vb. için güvence bedeli</p>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={ciPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={ciNext}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Keycard */}
              {ciStep === "keycard" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Anahtar Kart</p>
                          <p className="text-[11px] text-muted-foreground">
                            Oda {ciSelectedRoom} için kart programlayın
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <label className="text-[11px] font-medium">Kart Adedi</label>
                        <Select value={ciKeycardCount} onValueChange={setCiKeycardCount}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Kart</SelectItem>
                            <SelectItem value="2">2 Kart</SelectItem>
                            <SelectItem value="3">3 Kart</SelectItem>
                            <SelectItem value="4">4 Kart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Check-in Summary */}
                      <Separator />
                      <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Check-in Özeti</p>
                        <div className="grid grid-cols-2 gap-1 text-[12px]">
                          <span className="text-muted-foreground">Misafir:</span>
                          <span className="font-medium">{ciRes.guest.firstName} {ciRes.guest.lastName}</span>
                          <span className="text-muted-foreground">Oda:</span>
                          <span className="font-medium">{ciSelectedRoom}</span>
                          <span className="text-muted-foreground">Tarih:</span>
                          <span className="font-medium">{formatDate(ciRes.checkIn)} → {formatDate(ciRes.checkOut)}</span>
                          <span className="text-muted-foreground">Ödeme:</span>
                          <span className="font-medium">{ciPaymentAmount ? `₺${ciPaymentAmount}` : "—"} ({paymentMethods.find((p) => p.value === ciPaymentMethod)?.label})</span>
                          <span className="text-muted-foreground">Depozito:</span>
                          <span className="font-medium">{ciDepositAmount ? `₺${ciDepositAmount}` : "—"}</span>
                          <span className="text-muted-foreground">Kart:</span>
                          <span className="font-medium">{ciKeycardCount} adet</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={ciPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={completeCheckIn} disabled={ciProcessing}>
                      {ciProcessing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                      Check-in Tamamla
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Done */}
              {ciStep === "done" && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-[15px] font-bold">Check-in Tamamlandı!</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {ciRes.guest.firstName} {ciRes.guest.lastName} — Oda {ciSelectedRoom}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ciKeycardCount} anahtar kart teslim edildi
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCiOpen(false)}>
                      Kapat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => ciRes && printCheckInReceipt(
                      ciRes,
                      ciSelectedRoom,
                      ciKeycardCount,
                      parseFloat(ciDepositAmount) || 0,
                      parseFloat(ciPaymentAmount) || 0,
                      ciPaymentMethod,
                    )}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" /> Fiş Yazdır
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CHECK-OUT DIALOG                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={coOpen} onOpenChange={(open) => { if (!open) setCoOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {coRes && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[15px]">
                  <LogOut className="h-4 w-4 text-orange-600" />
                  Check-out: {coRes.guest.firstName} {coRes.guest.lastName}
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  Oda {coRes.room?.number || "—"} · {coRes.confirmationNumber} · {coRes.nights} gece
                </DialogDescription>
              </DialogHeader>

              <Stepper steps={coSteps} current={coStep} />

              {/* Step 1: Folio Review */}
              {coStep === "folio" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Folio Özeti</p>
                      <div className="space-y-1">
                        {buildFolioItems(coRes).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[12px]">
                            <span className={item.amount < 0 ? "text-emerald-600" : ""}>{item.desc}</span>
                            <span className={cn("font-medium", item.amount < 0 ? "text-emerald-600" : "")}>
                              {item.amount < 0 ? "-" : ""}₺{Math.abs(item.amount).toLocaleString("tr-TR")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div>
                        <label className="text-[11px] font-medium">Minibar / Son Dakika Masrafı (₺)</label>
                        <Input
                          type="number"
                          value={coMinibarCharges}
                          onChange={(e) => setCoMinibarCharges(e.target.value)}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-[13px] font-semibold">Kalan Bakiye</span>
                        <span className={cn("text-[15px] font-bold", (coRes.balance + (parseFloat(coMinibarCharges) || 0) + coBarTotal) > 0 ? "text-destructive" : "text-emerald-600")}>
                          {formatCurrency(coRes.balance + (parseFloat(coMinibarCharges) || 0) + coBarTotal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={coNext}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Final Payment */}
              {coStep === "payment" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Son Ödeme</p>
                          <p className="text-[11px] text-muted-foreground">
                            Kalan bakiye: {formatCurrency(coRes.balance + (parseFloat(coMinibarCharges) || 0) + coBarTotal)}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      {(coRes.balance + (parseFloat(coMinibarCharges) || 0) + coBarTotal) > 0 ? (
                        <>
                          <div>
                            <label className="text-[11px] font-medium">Ödeme Yöntemi</label>
                            <div className="mt-1.5 flex gap-2">
                              {paymentMethods.map((pm) => {
                                const PMIcon = pm.icon;
                                return (
                                  <button
                                    type="button"
                                    key={pm.value}
                                    onClick={() => setCoPaymentMethod(pm.value)}
                                    className={cn(
                                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg border p-2.5 text-[11px] font-medium transition-all",
                                      coPaymentMethod === pm.value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "hover:border-primary/30"
                                    )}
                                  >
                                    <PMIcon className="h-3.5 w-3.5" /> {pm.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium">Ödeme Tutarı (₺)</label>
                            <Input
                              type="number"
                              value={coPaymentAmount}
                              onChange={(e) => setCoPaymentAmount(e.target.value)}
                              placeholder={(coRes.balance + (parseFloat(coMinibarCharges) || 0)).toString()}
                              className="mt-1"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-[12px] font-medium text-emerald-700">Tüm ödemeler tamamlandı, ek ödeme gerekmiyor.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={coPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={coNext}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Keycard Return */}
              {coStep === "keycard" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Anahtar Kart İadesi</p>
                          <p className="text-[11px] text-muted-foreground">Kartları teslim alın ve iptal edin</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCoKeycardReturned(!coKeycardReturned)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                            coKeycardReturned ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                          )}
                        >
                          {coKeycardReturned && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span className="text-[12px] font-medium">Anahtar kartlar teslim alındı ve iptal edildi</span>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCoRoomClean(!coRoomClean)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                            coRoomClean ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                          )}
                        >
                          {coRoomClean && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span className="text-[12px] font-medium">Oda kontrol edildi (hasar yok)</span>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={coPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={coNext} disabled={!coKeycardReturned}>
                      Devam <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Feedback */}
              {coStep === "feedback" && (
                <div className="space-y-3">
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Star className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold">Misafir Değerlendirmesi</p>
                          <p className="text-[11px] text-muted-foreground">Opsiyonel — misafir geri bildirimi</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <label className="text-[11px] font-medium">Puan</label>
                        <div className="mt-1.5 flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              type="button"
                              key={s}
                              onClick={() => setCoRating(s)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star className={cn("h-7 w-7", s <= coRating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium">Yorum</label>
                        <Input
                          value={coFeedback}
                          onChange={(e) => setCoFeedback(e.target.value)}
                          placeholder="Misafir yorumu..."
                          className="mt-1"
                        />
                      </div>
                      {/* Checkout summary */}
                      <Separator />
                      <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Check-out Özeti</p>
                        <div className="grid grid-cols-2 gap-1 text-[12px]">
                          <span className="text-muted-foreground">Misafir:</span>
                          <span className="font-medium">{coRes.guest.firstName} {coRes.guest.lastName}</span>
                          <span className="text-muted-foreground">Oda:</span>
                          <span className="font-medium">{coRes.room?.number || "—"}</span>
                          <span className="text-muted-foreground">Konaklama:</span>
                          <span className="font-medium">{formatDate(coRes.checkIn)} → {formatDate(coRes.checkOut)}</span>
                          <span className="text-muted-foreground">Toplam:</span>
                          <span className="font-medium">{formatCurrency(coRes.totalAmount + (parseFloat(coMinibarCharges) || 0))}</span>
                          <span className="text-muted-foreground">Son Ödeme:</span>
                          <span className="font-medium">{coPaymentAmount ? `₺${coPaymentAmount}` : "—"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={coPrev}>
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                    <Button size="sm" onClick={completeCheckOut} disabled={coProcessing}>
                      {coProcessing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                      Check-out Tamamla
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Done */}
              {coStep === "done" && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-[15px] font-bold">Check-out Tamamlandı!</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {coRes.guest.firstName} {coRes.guest.lastName} — Oda {coRes.room?.number || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Oda housekeeping ekibine bildirildi
                  </p>
                  {coRating > 0 && (
                    <div className="mt-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("h-4 w-4", s <= coRating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCoOpen(false)}>
                      Kapat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => coRes && printCheckOutInvoice(
                      coRes,
                      parseFloat(coMinibarCharges) || 0,
                      parseFloat(coPaymentAmount) || 0,
                      coPaymentMethod,
                    )}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" /> Fatura Yazdır
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small helper component
function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("mt-0.5 text-[12px] font-medium", highlight && "text-destructive")}>{value}</p>
    </div>
  );
}

export default function FrontDeskPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <FrontDeskContent />
    </Suspense>
  );
}
