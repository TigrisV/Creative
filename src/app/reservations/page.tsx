"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, isPhoneValid, isEmailValid, formatFullPhone } from "@/components/ui/phone-input";
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
import { getReservations, createReservation, updateReservation } from "@/lib/data-service";
import { calculateStayRate, calculateDiscount } from "@/lib/rate-service";
import { createGroupReservation, type GroupRoomRequest } from "@/lib/group-reservation-service";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Reservation, ReservationStatus, MealPlan } from "@/lib/types";
import {
  Search,
  Plus,
  CalendarCheck,
  Eye,
  LogIn,
  LogOut,
  X,
  User,
  Phone,
  Mail,
  Globe,
  BedDouble,
  CreditCard,
  FileText,
  CheckCircle2,
  Copy,
  Coffee,
  Edit3,
  Save,
  Users,
} from "lucide-react";

const statusConfig: Record<ReservationStatus, { label: string; variant: string }> = {
  confirmed: { label: "Onaylandı", variant: "info" },
  "checked-in": { label: "Giriş Yapıldı", variant: "success" },
  "checked-out": { label: "Çıkış Yapıldı", variant: "secondary" },
  cancelled: { label: "İptal", variant: "destructive" },
  "no-show": { label: "Gelmedi", variant: "warning" },
  pending: { label: "Beklemede", variant: "outline" },
};

const typeLabels: Record<string, string> = {
  standard: "Standart",
  deluxe: "Deluxe",
  suite: "Süit",
  family: "Aile",
  king: "King",
  twin: "Twin",
};

const mealPlanLabels: Record<string, string> = {
  RO: "Sadece Oda",
  BB: "Kahvaltı Dahil",
  HB: "Yarım Pansiyon",
  FB: "Tam Pansiyon",
  AI: "Her Şey Dahil",
};

export default function ReservationsPage() {
  const router = useRouter();
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getReservations();
      setAllReservations(data);
    } catch (err) {
      console.error("Rezervasyonlar yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  // Group reservation
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [grpName, setGrpName] = useState("");
  const [grpContact, setGrpContact] = useState("");
  const [grpPhone, setGrpPhone] = useState("");
  const [grpEmail, setGrpEmail] = useState("");
  const [grpCompany, setGrpCompany] = useState("");
  const [grpCheckIn, setGrpCheckIn] = useState("");
  const [grpCheckOut, setGrpCheckOut] = useState("");
  const [grpNotes, setGrpNotes] = useState("");
  const [grpRooms, setGrpRooms] = useState<GroupRoomRequest[]>([
    { roomType: "standard", quantity: 1, adults: 2, children: 0, mealPlan: "BB" },
  ]);
  const [grpLoading, setGrpLoading] = useState(false);

  // Edit reservation
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    checkIn: "", checkOut: "", roomType: "standard",
    adults: 2, children: 0, mealPlan: "BB",
    ratePerNight: 0, source: "", specialRequests: "",
  });

  const startEdit = (res: Reservation) => {
    setEditForm({
      firstName: res.guest.firstName,
      lastName: res.guest.lastName,
      phone: res.guest.phone,
      email: res.guest.email,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      roomType: res.roomType,
      adults: res.adults,
      children: res.children,
      mealPlan: res.mealPlan || "BB",
      ratePerNight: res.ratePerNight,
      source: res.source,
      specialRequests: res.specialRequests || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!detailRes) return;
    const ci = new Date(editForm.checkIn);
    const co = new Date(editForm.checkOut);
    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * editForm.ratePerNight;
    const paidAmount = detailRes.paidAmount;
    const balance = totalAmount - paidAmount;

    const updates: Partial<Reservation> = {
      guest: { ...detailRes.guest, firstName: editForm.firstName, lastName: editForm.lastName, phone: editForm.phone, email: editForm.email },
      checkIn: editForm.checkIn,
      checkOut: editForm.checkOut,
      nights,
      roomType: editForm.roomType as any,
      adults: editForm.adults,
      children: editForm.children,
      mealPlan: editForm.mealPlan as MealPlan,
      ratePerNight: editForm.ratePerNight,
      totalAmount,
      balance,
      source: editForm.source,
      specialRequests: editForm.specialRequests || undefined,
    };

    const updatedRes = { ...detailRes, ...updates };
    setAllReservations((prev) => prev.map((r) => r.id === detailRes.id ? updatedRes : r));
    setDetailRes(updatedRes);
    setEditMode(false);
    updateReservation(detailRes.id, updates).catch((err) => console.error("Güncelleme başarısız:", err));
  };

  // Duplicate reservation
  const [dupRes, setDupRes] = useState<Reservation | null>(null);
  const [dupCount, setDupCount] = useState(1);
  const [dupLoading, setDupLoading] = useState(false);

  // New reservation form
  const [newForm, setNewForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    checkIn: "", checkOut: "", roomType: "standard",
    adults: 2, children: 0, mealPlan: "BB" as string, specialRequests: "",
  });
  const [phoneCountry, setPhoneCountry] = useState("TR");
  const [emailTouched, setEmailTouched] = useState(false);
  const phoneOk = newForm.phone ? isPhoneValid(newForm.phone, phoneCountry) : true;
  const emailOk = newForm.email ? isEmailValid(newForm.email) : true;

  const filteredReservations = allReservations.filter((res) => {
    const matchesSearch =
      res.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${res.guest.firstName} ${res.guest.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || res.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateReservation = () => {
    if (!newForm.firstName || !newForm.lastName || !newForm.checkIn || !newForm.checkOut) return;
    const stayCalc = calculateStayRate(newForm.checkIn, newForm.checkOut, newForm.roomType as any);
    const nights = stayCalc.nights;
    const discount = calculateDiscount(newForm.checkIn, nights);
    const discountMultiplier = 1 - (discount.discountPercent / 100);
    const totalAmount = Math.round(stayCalc.totalAmount * discountMultiplier);
    const ratePerNight = stayCalc.avgRate;

    const newRes: Reservation = {
      id: `res-new-${Date.now()}`,
      confirmationNumber: `CNF-${Date.now().toString().slice(-6)}`,
      guest: {
        id: `g-new-${Date.now()}`,
        firstName: newForm.firstName,
        lastName: newForm.lastName,
        email: newForm.email || `${newForm.firstName.toLowerCase()}@email.com`,
        phone: newForm.phone ? formatFullPhone(newForm.phone, phoneCountry) : "+90 5xx xxx xxxx",
        idNumber: "",
        nationality: "TR",
        totalStays: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      },
      roomType: newForm.roomType as any,
      checkIn: newForm.checkIn,
      checkOut: newForm.checkOut,
      nights,
      adults: newForm.adults,
      children: newForm.children,
      status: "confirmed",
      source: "Direkt",
      ratePerNight,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      mealPlan: (newForm.mealPlan || "BB") as MealPlan,
      specialRequests: newForm.specialRequests || undefined,
      createdAt: new Date().toISOString(),
    };

    createReservation(newRes).then((saved) => {
      setAllReservations((prev) => [saved, ...prev]);
    }).catch((err) => console.error("Rezervasyon oluşturulamadı:", err));
    setNewForm({ firstName: "", lastName: "", phone: "", email: "", checkIn: "", checkOut: "", roomType: "standard", adults: 2, children: 0, mealPlan: "BB", specialRequests: "" });
    setPhoneCountry("TR");
    setEmailTouched(false);
    setShowNewDialog(false);
  };

  const handleStatusChange = (resId: string, newStatus: ReservationStatus) => {
    setAllReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );
    updateReservation(resId, { status: newStatus }).catch((err) =>
      console.error("Durum güncellenemedi:", err)
    );
  };

  const handleGroupCreate = async () => {
    if (!grpName || !grpContact || !grpCheckIn || !grpCheckOut) return;
    setGrpLoading(true);
    try {
      const { reservations } = await createGroupReservation({
        groupName: grpName,
        contactName: grpContact,
        contactPhone: grpPhone,
        contactEmail: grpEmail,
        companyName: grpCompany || undefined,
        checkIn: grpCheckIn,
        checkOut: grpCheckOut,
        rooms: grpRooms,
        notes: grpNotes || undefined,
      });
      setAllReservations((prev) => [...reservations, ...prev]);
      setShowGroupDialog(false);
      setGrpName(""); setGrpContact(""); setGrpPhone(""); setGrpEmail("");
      setGrpCompany(""); setGrpCheckIn(""); setGrpCheckOut(""); setGrpNotes("");
      setGrpRooms([{ roomType: "standard", quantity: 1, adults: 2, children: 0, mealPlan: "BB" }]);
    } catch (err) {
      console.error("Grup rezervasyonu oluşturulamadı:", err);
    } finally {
      setGrpLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!dupRes || dupCount < 1) return;
    setDupLoading(true);
    try {
      const created: Reservation[] = [];
      for (let i = 0; i < dupCount; i++) {
        const copy: Reservation = {
          ...dupRes,
          id: `res-dup-${Date.now()}-${i}`,
          confirmationNumber: `CNF-${Date.now().toString().slice(-6)}-${i + 1}`,
          status: "confirmed",
          paidAmount: 0,
          balance: dupRes.totalAmount,
          room: undefined,
          createdAt: new Date().toISOString(),
        };
        const saved = await createReservation(copy);
        created.push(saved);
      }
      setAllReservations((prev) => [...created, ...prev]);
      setDupRes(null);
      setDupCount(1);
    } catch (err) {
      console.error("Kopyalama başarısız:", err);
    } finally {
      setDupLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Rezervasyonlar</h1>
          <p className="text-[13px] text-muted-foreground">
            Toplam {allReservations.length} rezervasyon &middot;{" "}
            {allReservations.filter((r) => r.status === "confirmed").length} onaylı
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGroupDialog(true)}>
            <Users className="mr-2 h-4 w-4" />
            Grup Rez.
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Rezervasyon
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          Tümü ({allReservations.length})
        </Button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = allReservations.filter((r) => r.status === status).length;
          if (count === 0) return null;
          return (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Konfirmasyon no veya misafir adı ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasyon</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Misafir</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda Tipi</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Giriş</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Çıkış</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gece</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Durum</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kahvaltı</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kaynak</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tutar</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bakiye</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[13px] text-muted-foreground">
                    Eşleşen rezervasyon bulunamadı
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const sc = statusConfig[res.status];
                  return (
                    <tr key={res.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium text-primary">{res.confirmationNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{res.guest.firstName} {res.guest.lastName}</p>
                          <p className="text-xs text-muted-foreground">{res.guest.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{typeLabels[res.roomType]}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(res.checkIn)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(res.checkOut)}</td>
                      <td className="px-4 py-3 text-sm text-center">{res.nights}</td>
                      <td className="px-4 py-3">
                        <Badge variant={sc.variant as any} className="text-[10px]">{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{mealPlanLabels[res.mealPlan || "BB"] || "Kahvaltı Dahil"}</Badge></td>
                      <td className="px-4 py-3 text-sm">{res.source}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(res.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={res.balance > 0 ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
                          {formatCurrency(res.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDetailRes(res)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {res.status === "confirmed" && (
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => router.push(`/front-desk?checkin=${res.id}`)}
                            >
                              <LogIn className="mr-1 h-3 w-3" /> Check-in
                            </Button>
                          )}
                          {res.status === "checked-in" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => router.push(`/front-desk?checkout=${res.id}`)}
                            >
                              <LogOut className="mr-1 h-3 w-3" /> Check-out
                            </Button>
                          )}
                          {res.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-destructive"
                              onClick={() => handleStatusChange(res.id, "cancelled")}
                            >
                              <X className="mr-1 h-3 w-3" /> İptal
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Kopyala"
                            onClick={() => { setDupRes(res); setDupCount(1); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ═══ New Reservation Dialog ═══ */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Rezervasyon</DialogTitle>
            <DialogDescription>
              Yeni bir rezervasyon oluşturmak için aşağıdaki formu doldurun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ad *</label>
                <Input placeholder="Misafir adı" className="mt-1" value={newForm.firstName} onChange={(e) => setNewForm((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Soyad *</label>
                <Input placeholder="Misafir soyadı" className="mt-1" value={newForm.lastName} onChange={(e) => setNewForm((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <PhoneInput
                  className="mt-1"
                  value={newForm.phone}
                  onChange={(v) => setNewForm((p) => ({ ...p, phone: v }))}
                  countryCode={phoneCountry}
                  onCountryChange={setPhoneCountry}
                />
                {newForm.phone && !phoneOk && (
                  <p className="mt-1 text-[11px] text-destructive">Numara eksik</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">E-posta</label>
                <Input
                  placeholder="ornek@email.com"
                  className={`mt-1 ${emailTouched && newForm.email && !emailOk ? "border-destructive" : emailTouched && newForm.email && emailOk ? "border-emerald-500" : ""}`}
                  value={newForm.email}
                  onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && newForm.email && !emailOk && (
                  <p className="mt-1 text-[11px] text-destructive">Geçersiz e-posta adresi</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Giriş Tarihi *</label>
                <Input type="date" className="mt-1" value={newForm.checkIn} onChange={(e) => setNewForm((p) => ({ ...p, checkIn: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Çıkış Tarihi *</label>
                <Input type="date" className="mt-1" value={newForm.checkOut} onChange={(e) => setNewForm((p) => ({ ...p, checkOut: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Oda Tipi</label>
                <Select value={newForm.roomType} onValueChange={(v) => setNewForm((p) => ({ ...p, roomType: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Yetişkin</label>
                <Input type="number" min={1} className="mt-1" value={newForm.adults} onChange={(e) => setNewForm((p) => ({ ...p, adults: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Çocuk</label>
                <Input type="number" min={0} className="mt-1" value={newForm.children} onChange={(e) => setNewForm((p) => ({ ...p, children: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Kahvaltı / Pansiyon</label>
                <Select value={newForm.mealPlan} onValueChange={(v) => setNewForm((p) => ({ ...p, mealPlan: v }))}>
                  <SelectTrigger className="mt-1">
                    <Coffee className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(mealPlanLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Özel İstekler</label>
                <Input placeholder="Varsa özel istekleri yazın..." className="mt-1" value={newForm.specialRequests} onChange={(e) => setNewForm((p) => ({ ...p, specialRequests: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateReservation} disabled={!newForm.firstName || !newForm.lastName || !newForm.checkIn || !newForm.checkOut || (!!newForm.phone && !phoneOk) || (!!newForm.email && !emailOk)}>
              Rezervasyon Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Reservation Detail / Edit Dialog ═══ */}
      <Dialog open={!!detailRes} onOpenChange={(open) => { if (!open) { setDetailRes(null); setEditMode(false); } }}>
        <DialogContent className="max-w-2xl">
          {detailRes && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-[15px] flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {detailRes.confirmationNumber}
                    <Badge variant={statusConfig[detailRes.status].variant as any} className="ml-2 text-[10px]">
                      {statusConfig[detailRes.status].label}
                    </Badge>
                  </DialogTitle>
                  {!editMode ? (
                    <Button variant="outline" size="sm" onClick={() => startEdit(detailRes)}>
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" />Düzenle
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                        <X className="mr-1 h-3.5 w-3.5" />Vazgeç
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={!editForm.firstName || !editForm.lastName || !editForm.checkIn || !editForm.checkOut}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />Kaydet
                      </Button>
                    </div>
                  )}
                </div>
                <DialogDescription className="text-[12px]">
                  {editMode ? "Rezervasyon bilgilerini düzenleyin." : "Rezervasyon Detayı"}
                </DialogDescription>
              </DialogHeader>

              {editMode ? (
                <div className="space-y-4 py-2">
                  {/* Guest info */}
                  <fieldset className="fidelio-fieldset">
                    <legend>Misafir Bilgileri</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Ad *</label>
                        <Input className="mt-1 h-8 text-[13px]" value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Soyad *</label>
                        <Input className="mt-1 h-8 text-[13px]" value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Telefon</label>
                        <Input className="mt-1 h-8 text-[13px]" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">E-posta</label>
                        <Input className="mt-1 h-8 text-[13px]" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                  </fieldset>

                  {/* Dates & Room */}
                  <fieldset className="fidelio-fieldset">
                    <legend>Konaklama Bilgileri</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Giriş Tarihi *</label>
                        <Input type="date" className="mt-1 h-8 text-[13px]" value={editForm.checkIn} onChange={(e) => setEditForm((p) => ({ ...p, checkIn: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Çıkış Tarihi *</label>
                        <Input type="date" className="mt-1 h-8 text-[13px]" value={editForm.checkOut} onChange={(e) => setEditForm((p) => ({ ...p, checkOut: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Oda Tipi</label>
                        <Select value={editForm.roomType} onValueChange={(v) => setEditForm((p) => ({ ...p, roomType: v }))}>
                          <SelectTrigger className="mt-1 h-8 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Kahvaltı / Pansiyon</label>
                        <Select value={editForm.mealPlan} onValueChange={(v) => setEditForm((p) => ({ ...p, mealPlan: v }))}>
                          <SelectTrigger className="mt-1 h-8 text-[13px]"><Coffee className="mr-1 h-3 w-3 text-muted-foreground" /><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(mealPlanLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Yetişkin</label>
                        <Input type="number" min={1} className="mt-1 h-8 text-[13px]" value={editForm.adults} onChange={(e) => setEditForm((p) => ({ ...p, adults: parseInt(e.target.value) || 1 }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Çocuk</label>
                        <Input type="number" min={0} className="mt-1 h-8 text-[13px]" value={editForm.children} onChange={(e) => setEditForm((p) => ({ ...p, children: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </fieldset>

                  {/* Pricing */}
                  <fieldset className="fidelio-fieldset">
                    <legend>Fiyat & Kaynak</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Gecelik Fiyat (₺)</label>
                        <Input type="number" min={0} className="mt-1 h-8 text-[13px]" value={editForm.ratePerNight} onChange={(e) => setEditForm((p) => ({ ...p, ratePerNight: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Kaynak</label>
                        <Input className="mt-1 h-8 text-[13px]" value={editForm.source} onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))} placeholder="Booking.com, Direkt..." />
                      </div>
                    </div>
                    {editForm.checkIn && editForm.checkOut && editForm.ratePerNight > 0 && (
                      <div className="mt-3 rounded-md bg-muted/50 p-2 text-[12px]">
                        {(() => {
                          const n = Math.max(1, Math.ceil((new Date(editForm.checkOut).getTime() - new Date(editForm.checkIn).getTime()) / 86400000));
                          return <span><strong>{n}</strong> gece × <strong>{formatCurrency(editForm.ratePerNight)}</strong> = <strong>{formatCurrency(n * editForm.ratePerNight)}</strong></span>;
                        })()}
                      </div>
                    )}
                  </fieldset>

                  {/* Special requests */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Özel İstekler</label>
                    <Input className="mt-1 h-8 text-[13px]" value={editForm.specialRequests} onChange={(e) => setEditForm((p) => ({ ...p, specialRequests: e.target.value }))} placeholder="Varsa özel istekler..." />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {detailRes.guest.firstName[0]}{detailRes.guest.lastName[0]}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">{detailRes.guest.firstName} {detailRes.guest.lastName}</p>
                      <div className="flex gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{detailRes.guest.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{detailRes.guest.email}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Oda Tipi</p>
                      <p className="mt-1 text-[13px] font-medium">{typeLabels[detailRes.roomType]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Kahvaltı / Pansiyon</p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">{mealPlanLabels[detailRes.mealPlan || "BB"]}</Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Giriş</p>
                      <p className="mt-1 text-[13px]">{formatDate(detailRes.checkIn)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Çıkış</p>
                      <p className="mt-1 text-[13px]">{formatDate(detailRes.checkOut)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Gece / Kişi</p>
                      <p className="mt-1 text-[13px]">{detailRes.nights} gece · {detailRes.adults} yetişkin{detailRes.children > 0 ? `, ${detailRes.children} çocuk` : ""}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Kaynak</p>
                      <p className="mt-1 text-[13px]">{detailRes.source}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span>Gecelik</span>
                      <span className="font-medium">{formatCurrency(detailRes.ratePerNight)}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span>Toplam ({detailRes.nights} gece)</span>
                      <span className="font-semibold">{formatCurrency(detailRes.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[13px] text-emerald-600">
                      <span>Ödenen</span>
                      <span>-{formatCurrency(detailRes.paidAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-[14px] font-bold">
                      <span>Bakiye</span>
                      <span className={detailRes.balance > 0 ? "text-destructive" : "text-emerald-600"}>
                        {formatCurrency(detailRes.balance)}
                      </span>
                    </div>
                  </div>
                  {detailRes.specialRequests && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Özel İstekler</p>
                      <p className="text-[12px]">{detailRes.specialRequests}</p>
                    </div>
                  )}
                  {detailRes.room && (
                    <div className="flex items-center gap-2 text-[12px]">
                      <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Atanan Oda: <strong>{detailRes.room.number}</strong> (Kat {detailRes.room.floor})</span>
                    </div>
                  )}
                </div>
              )}

              {!editMode && (
                <DialogFooter>
                  {detailRes.status === "confirmed" && (
                    <Button size="sm" onClick={() => { const id = detailRes.id; setDetailRes(null); router.push(`/front-desk?checkin=${id}`); }}>
                      <LogIn className="mr-1 h-3.5 w-3.5" /> Check-in Yap
                    </Button>
                  )}
                  {detailRes.status === "checked-in" && (
                    <Button size="sm" variant="outline" onClick={() => { const id = detailRes.id; setDetailRes(null); router.push(`/front-desk?checkout=${id}`); }}>
                      <LogOut className="mr-1 h-3.5 w-3.5" /> Check-out Yap
                    </Button>
                  )}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Duplicate Reservation Dialog ═══ */}
      <Dialog open={!!dupRes} onOpenChange={(open) => { if (!open) { setDupRes(null); setDupCount(1); } }}>
        <DialogContent className="max-w-md">
          {dupRes && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[15px] flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  Rezervasyon Kopyala
                </DialogTitle>
                <DialogDescription className="text-[12px]">
                  Seçilen rezervasyonu istediğiniz kadar çoğaltın. Her kopya yeni bir konfirmasyon numarası alır.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-[13px] font-semibold">{dupRes.guest.firstName} {dupRes.guest.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dupRes.confirmationNumber} · {typeLabels[dupRes.roomType]} · {formatDate(dupRes.checkIn)} → {formatDate(dupRes.checkOut)} · {dupRes.nights} gece
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {mealPlanLabels[dupRes.mealPlan || "BB"]} · {dupRes.adults} yetişkin{dupRes.children > 0 ? `, ${dupRes.children} çocuk` : ""} · {formatCurrency(dupRes.totalAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Kaç adet kopyalansın?</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDupCount((c) => Math.max(1, c - 1))} disabled={dupCount <= 1}>−</Button>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      className="w-20 text-center text-lg font-bold"
                      value={dupCount}
                      onChange={(e) => setDupCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDupCount((c) => Math.min(50, c + 1))} disabled={dupCount >= 50}>+</Button>
                    <span className="text-[12px] text-muted-foreground">
                      Toplam: {formatCurrency(dupRes.totalAmount * dupCount)}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setDupRes(null); setDupCount(1); }}>İptal</Button>
                <Button size="sm" onClick={handleDuplicate} disabled={dupLoading || dupCount < 1}>
                  {dupLoading ? "Kopyalanıyor..." : <><Copy className="mr-1.5 h-3.5 w-3.5" />{dupCount} Adet Kopyala</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Group Reservation Dialog ═══ */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grup Rezervasyonu
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Birden fazla odayı tek seferde rezerve edin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Grup Adı *</label>
                <Input value={grpName} onChange={(e) => setGrpName(e.target.value)} placeholder="Şirket Toplantısı" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">İletişim Kişisi *</label>
                <Input value={grpContact} onChange={(e) => setGrpContact(e.target.value)} placeholder="Ad Soyad" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Telefon</label>
                <Input value={grpPhone} onChange={(e) => setGrpPhone(e.target.value)} placeholder="+90 5xx" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">E-posta</label>
                <Input value={grpEmail} onChange={(e) => setGrpEmail(e.target.value)} placeholder="email@sirket.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Şirket</label>
                <Input value={grpCompany} onChange={(e) => setGrpCompany(e.target.value)} placeholder="Şirket adı" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Giriş Tarihi *</label>
                <Input type="date" value={grpCheckIn} onChange={(e) => setGrpCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Çıkış Tarihi *</label>
                <Input type="date" value={grpCheckOut} onChange={(e) => setGrpCheckOut(e.target.value)} />
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Odalar</p>
              <Button variant="outline" size="sm" onClick={() => setGrpRooms([...grpRooms, { roomType: "standard", quantity: 1, adults: 2, children: 0, mealPlan: "BB" }])}>
                <Plus className="mr-1 h-3 w-3" /> Oda Ekle
              </Button>
            </div>
            {grpRooms.map((room, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-end rounded border p-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Oda Tipi</label>
                  <Select value={room.roomType} onValueChange={(v) => {
                    const copy = [...grpRooms]; copy[idx] = { ...copy[idx], roomType: v as any }; setGrpRooms(copy);
                  }}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Adet</label>
                  <Input type="number" min={1} max={50} className="h-8 text-[12px]" value={room.quantity}
                    onChange={(e) => { const copy = [...grpRooms]; copy[idx] = { ...copy[idx], quantity: parseInt(e.target.value) || 1 }; setGrpRooms(copy); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Yetişkin</label>
                  <Input type="number" min={1} max={6} className="h-8 text-[12px]" value={room.adults}
                    onChange={(e) => { const copy = [...grpRooms]; copy[idx] = { ...copy[idx], adults: parseInt(e.target.value) || 1 }; setGrpRooms(copy); }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Pansiyon</label>
                  <Select value={room.mealPlan} onValueChange={(v) => {
                    const copy = [...grpRooms]; copy[idx] = { ...copy[idx], mealPlan: v as any }; setGrpRooms(copy);
                  }}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(mealPlanLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {grpRooms.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => setGrpRooms(grpRooms.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Not</label>
              <Input value={grpNotes} onChange={(e) => setGrpNotes(e.target.value)} placeholder="Grup hakkında not..." />
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-[12px]">
              <p className="font-semibold">Toplam: {grpRooms.reduce((s, r) => s + r.quantity, 0)} oda</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowGroupDialog(false)}>İptal</Button>
            <Button size="sm" onClick={handleGroupCreate} disabled={grpLoading || !grpName || !grpContact || !grpCheckIn || !grpCheckOut}>
              {grpLoading ? "Oluşturuluyor..." : <><Users className="mr-1.5 h-3.5 w-3.5" />Grup Oluştur</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
