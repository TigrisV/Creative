"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { getReservations, updateReservation, updateRoom, clearRoomGuest, getRoomsWithGuests } from "@/lib/data-service";
import { getChargesForReservation } from "@/lib/night-audit-service";
import { getBarOrders } from "@/lib/staff-service";
import type { Reservation, BarOrder } from "@/lib/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { FolioItem } from "@/lib/types";
import {
  Receipt,
  CreditCard,
  Plus,
  Printer,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Trash2,
  CheckCircle2,
  DollarSign,
  BedDouble,
  Coffee,
  Sparkles,
  ShoppingBag,
  Utensils,
  Wine,
  Shirt,
  Phone,
  X,
  LogOut,
  Building,
} from "lucide-react";

const KDV_RATE = 0.10;

const chargeCategories = [
  { value: "Konaklama", label: "Konaklama", icon: BedDouble },
  { value: "Yiyecek & İçecek", label: "Yiyecek & İçecek", icon: Utensils },
  { value: "Minibar", label: "Minibar", icon: Wine },
  { value: "Oda Servisi", label: "Oda Servisi", icon: Coffee },
  { value: "Restoran", label: "Restoran", icon: Utensils },
  { value: "Spa & Wellness", label: "Spa & Wellness", icon: Sparkles },
  { value: "Çamaşırhane", label: "Çamaşırhane", icon: Shirt },
  { value: "Telefon", label: "Telefon", icon: Phone },
  { value: "Mağaza", label: "Mağaza", icon: ShoppingBag },
  { value: "Diğer", label: "Diğer", icon: Receipt },
];

const paymentMethods = [
  { value: "cash", label: "Nakit" },
  { value: "credit_card", label: "Kredi Kartı" },
  { value: "bank_transfer", label: "Havale/EFT" },
  { value: "city_ledger", label: "City Ledger" },
];

interface FolioData {
  id: string;
  reservationId: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: string;
  items: FolioItem[];
}

function generateFolioId(resId: string): string {
  return `FOL-${resId.replace("res", "").padStart(4, "0")}`;
}

const fmt = (d: Date) => d.toISOString().split("T")[0];
const getToday = () => new Date();

function buildFolios(resList: Reservation[], allBarOrders: BarOrder[], today: Date = new Date()): FolioData[] {
  return resList
    .filter((r) => r.status === "checked-in" || r.status === "checked-out")
    .map((res) => {
      const items: FolioItem[] = [];
      let itemId = 1;

      const checkIn = new Date(res.checkIn);
      const nightsToPost = res.status === "checked-in"
        ? Math.max(1, Math.min(res.nights, Math.ceil((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))))
        : res.nights;

      for (let n = 0; n < nightsToPost; n++) {
        const d = new Date(checkIn);
        d.setDate(d.getDate() + n);
        items.push({
          id: `fi-${res.id}-${itemId++}`,
          date: fmt(d),
          description: `Oda Ücreti - ${res.roomType.charAt(0).toUpperCase() + res.roomType.slice(1)}`,
          category: "Konaklama",
          amount: res.ratePerNight,
          type: "charge",
        });
      }

      if (nightsToPost >= 1) {
        items.push({
          id: `fi-${res.id}-${itemId++}`,
          date: fmt(checkIn),
          description: "Minibar",
          category: "Minibar",
          amount: 150,
          type: "charge",
        });
      }
      if (nightsToPost >= 2) {
        items.push({
          id: `fi-${res.id}-${itemId++}`,
          date: fmt(new Date(checkIn.getTime() + 86400000)),
          description: "Spa - Masaj (60dk)",
          category: "Spa & Wellness",
          amount: 400,
          type: "charge",
        });
        items.push({
          id: `fi-${res.id}-${itemId++}`,
          date: fmt(new Date(checkIn.getTime() + 86400000)),
          description: "Restoran - Akşam Yemeği",
          category: "Restoran",
          amount: 320,
          type: "charge",
        });
      }

      // Night Audit charges
      const naCharges = getChargesForReservation(res.id);
      for (const nac of naCharges) {
        const isDuplicate = items.some(
          (i) => i.date === nac.date && i.category === nac.category && i.type === "charge" && Math.abs(i.amount - nac.amount) < 0.01
        );
        if (!isDuplicate) {
          items.push({
            id: nac.id,
            date: nac.date,
            description: nac.description,
            category: nac.category,
            amount: nac.amount,
            type: "charge",
          });
        }
      }

      // Bar / Room-service charges
      const roomNum = res.room?.number;
      if (roomNum) {
        const roomBarOrders = allBarOrders.filter(
          (bo) => bo.roomNumber === roomNum && bo.status !== "cancelled" && bo.paymentMethod === "room-charge"
        );
        for (const bo of roomBarOrders) {
          const alreadyAdded = items.some((i) => i.id === `bar-${bo.id}`);
          if (!alreadyAdded) {
            const itemNames = bo.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
            items.push({
              id: `bar-${bo.id}`,
              date: bo.createdAt.split("T")[0],
              description: `Bar — ${itemNames}`,
              category: "Yiyecek & İçecek",
              amount: bo.totalAmount,
              type: "charge",
            });
          }
        }
      }

      if (res.paidAmount > 0) {
        items.push({
          id: `fi-${res.id}-${itemId++}`,
          date: res.checkIn,
          description: "Kredi Kartı Ödeme",
          category: "Ödeme",
          amount: -res.paidAmount,
          type: "payment",
        });
      }

      return {
        id: generateFolioId(res.id),
        reservationId: res.confirmationNumber,
        guestName: `${res.guest.firstName} ${res.guest.lastName}`,
        roomNumber: res.room?.number || "—",
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        nights: res.nights,
        status: res.status,
        items,
      };
    });
}

export default function BillingPage() {
  const today = useMemo(() => getToday(), []);
  const [folios, setFolios] = useState<FolioData[]>([]);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getReservations(), getBarOrders()]).then(([resData, barData]) => {
      const built = buildFolios(resData, barData, today);
      setFolios(built);
      if (built.length > 0) setSelectedFolioId(built[0].id);
    }).catch(() => {});
  }, [today]);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Charge dialog
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    category: "Minibar",
    description: "",
    amount: "",
  });

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: "credit_card",
    amount: "",
    reference: "",
  });

  // Checkout dialog
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Invoice dialog
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);

  const selectedFolio = useMemo(
    () => folios.find((f) => f.id === selectedFolioId) || null,
    [folios, selectedFolioId]
  );

  const filteredFolios = useMemo(() => {
    if (!searchQuery) return folios;
    const q = searchQuery.toLowerCase();
    return folios.filter(
      (f) =>
        f.guestName.toLowerCase().includes(q) ||
        f.roomNumber.includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.reservationId.toLowerCase().includes(q)
    );
  }, [folios, searchQuery]);

  const calcFolio = useCallback((items: FolioItem[]) => {
    const charges = items.filter((i) => i.type === "charge").reduce((s, i) => s + i.amount, 0);
    const payments = items.filter((i) => i.type === "payment").reduce((s, i) => s + Math.abs(i.amount), 0);
    const subtotal = charges;
    const kdv = Math.round(subtotal * KDV_RATE * 100) / 100;
    const grandTotal = subtotal + kdv;
    const balance = grandTotal - payments;
    return { charges, payments, subtotal, kdv, grandTotal, balance };
  }, []);

  const currentCalc = useMemo(
    () => selectedFolio ? calcFolio(selectedFolio.items) : null,
    [selectedFolio, calcFolio]
  );

  // Add charge
  const handleAddCharge = () => {
    if (!selectedFolio || !chargeForm.description || !chargeForm.amount) return;
    const newItem: FolioItem = {
      id: `fi-new-${Date.now()}`,
      date: fmt(today),
      description: chargeForm.description,
      category: chargeForm.category,
      amount: parseFloat(chargeForm.amount),
      type: "charge",
    };
    setFolios((prev) =>
      prev.map((f) =>
        f.id === selectedFolio.id ? { ...f, items: [...f.items, newItem] } : f
      )
    );
    setChargeForm({ category: "Minibar", description: "", amount: "" });
    setChargeOpen(false);
  };

  // Add payment
  const handleAddPayment = () => {
    if (!selectedFolio || !paymentForm.amount) return;
    const newItem: FolioItem = {
      id: `fi-pay-${Date.now()}`,
      date: fmt(today),
      description: `${paymentMethods.find((m) => m.value === paymentForm.method)?.label || "Ödeme"}${paymentForm.reference ? ` (Ref: ${paymentForm.reference})` : ""}`,
      category: "Ödeme",
      amount: -Math.abs(parseFloat(paymentForm.amount)),
      type: "payment",
    };
    setFolios((prev) =>
      prev.map((f) =>
        f.id === selectedFolio.id ? { ...f, items: [...f.items, newItem] } : f
      )
    );
    setPaymentForm({ method: "credit_card", amount: "", reference: "" });
    setPaymentOpen(false);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    if (!selectedFolio) return;
    setFolios((prev) =>
      prev.map((f) =>
        f.id === selectedFolio.id
          ? { ...f, items: f.items.filter((i) => i.id !== itemId) }
          : f
      )
    );
  };

  // Print invoice
  const handlePrintInvoice = () => {
    setInvoiceOpen(true);
    setTimeout(() => {
      if (invoiceRef.current) {
        const printWindow = window.open("", "_blank", "width=800,height=1100");
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Fatura - ${selectedFolio?.id}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
              .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e40af; }
              .hotel-name { font-size: 24px; font-weight: 800; color: #1e40af; }
              .hotel-sub { font-size: 11px; color: #666; margin-top: 4px; }
              .invoice-title { font-size: 18px; font-weight: 700; text-align: right; }
              .invoice-meta { font-size: 11px; color: #666; text-align: right; margin-top: 4px; }
              .section { margin-bottom: 20px; }
              .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; margin-bottom: 8px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
              .info-row { display: flex; gap: 8px; }
              .info-label { color: #666; min-width: 100px; }
              .info-value { font-weight: 600; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
              th:last-child { text-align: right; }
              td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; }
              td:last-child { text-align: right; }
              .payment-row td { color: #059669; }
              .totals { margin-left: auto; width: 280px; margin-top: 10px; }
              .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
              .total-row.grand { font-size: 16px; font-weight: 800; padding: 8px 0; border-top: 2px solid #1e40af; margin-top: 6px; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #999; }
            </style></head><body>
            ${invoiceRef.current.innerHTML}
            <script>window.onload=function(){window.print();}</script>
            </body></html>
          `);
          printWindow.document.close();
        }
      }
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Kasa / Folio</h1>
          <p className="text-[13px] text-muted-foreground">Misafir hesapları, harcamalar ve faturalama</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left: Folio List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Misafir, oda veya folio ara..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-auto pr-1">
            {filteredFolios.map((folio) => {
              const calc = calcFolio(folio.items);
              const isSelected = folio.id === selectedFolioId;
              return (
                <Card
                  key={folio.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-primary shadow-md"
                  )}
                  onClick={() => setSelectedFolioId(folio.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{folio.guestName}</p>
                        <p className="text-xs text-muted-foreground">
                          Oda {folio.roomNumber} &middot; {folio.reservationId}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-primary">{folio.id}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-bold",
                          calc.balance > 0 ? "text-destructive" : "text-emerald-600"
                        )}>
                          {formatCurrency(calc.balance)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn("text-[9px] mt-1", folio.status === "checked-in" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100")}
                        >
                          {folio.status === "checked-in" ? "Konaklamada" : "Çıkış Yapıldı"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredFolios.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Folio bulunamadı</p>
            )}
          </div>
        </div>

        {/* Right: Folio Detail */}
        {selectedFolio && currentCalc ? (
          <div className="space-y-4">
            {/* Folio Header */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{selectedFolio.guestName}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">{selectedFolio.id}</Badge>
                    </div>
                    <CardDescription>
                      Oda {selectedFolio.roomNumber} &middot; {selectedFolio.reservationId} &middot;{" "}
                      {formatDate(selectedFolio.checkIn)} → {formatDate(selectedFolio.checkOut)} ({selectedFolio.nights} gece)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setChargeOpen(true)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Masraf Ekle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
                      <CreditCard className="mr-1 h-3 w-3" />
                      Ödeme Al
                    </Button>
                    {selectedFolio.status === "checked-in" && (
                      <Button size="sm" onClick={() => setCheckoutOpen(true)}>
                        <LogOut className="mr-1 h-3 w-3" />
                        Checkout
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tarih</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Açıklama</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kategori</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tutar</th>
                      <th className="w-10 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFolio.items.map((item) => (
                      <tr key={item.id} className="group border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm">{formatDate(item.date)}</td>
                        <td className="px-4 py-2.5 text-sm">{item.description}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {item.type === "payment" ? (
                            <span className="flex items-center justify-end gap-1 text-sm font-medium text-emerald-600">
                              <ArrowDownRight className="h-3 w-3" />
                              {formatCurrency(Math.abs(item.amount))}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1 text-sm font-medium">
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="invisible rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedFolio.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          Henüz işlem yok
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ara Toplam (Masraflar)</span>
                      <span className="font-medium">{formatCurrency(currentCalc.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">KDV (%{KDV_RATE * 100})</span>
                      <span className="font-medium">{formatCurrency(currentCalc.kdv)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Genel Toplam</span>
                      <span>{formatCurrency(currentCalc.grandTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Ödemeler</span>
                      <span className="font-medium">-{formatCurrency(currentCalc.payments)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Bakiye</span>
                      <span className={currentCalc.balance > 0 ? "text-destructive" : "text-emerald-600"}>
                        {formatCurrency(currentCalc.balance)}
                      </span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" className="flex-1" size="sm" onClick={handlePrintInvoice}>
                        <FileText className="mr-1 h-3 w-3" />
                        Fatura Kes
                      </Button>
                      <Button variant="outline" className="flex-1" size="sm" onClick={() => {
                        if (invoiceRef.current) {
                          const printWindow = window.open("", "_blank");
                          if (printWindow) {
                            printWindow.document.write(`<pre>${JSON.stringify({ folio: selectedFolio, totals: currentCalc }, null, 2)}</pre>`);
                            printWindow.document.close();
                          }
                        }
                      }}>
                        <Printer className="mr-1 h-3 w-3" />
                        Yazdır
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <Receipt className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>Folio seçin</p>
            </div>
          </Card>
        )}
      </div>

      {/* ========================
          ADD CHARGE DIALOG
          ======================== */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Masraf Ekle
            </DialogTitle>
            <DialogDescription>
              {selectedFolio?.guestName} — Oda {selectedFolio?.roomNumber} ({selectedFolio?.id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kategori</label>
              <Select
                value={chargeForm.category}
                onValueChange={(v) => {
                  setChargeForm((p) => ({
                    ...p,
                    category: v,
                    description: v === p.category ? p.description : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chargeCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick buttons */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hızlı Seçim</label>
              <div className="flex flex-wrap gap-1.5">
                {chargeForm.category === "Minibar" && (
                  <>
                    {[["Su", "25"], ["Kola", "40"], ["Bira", "60"], ["Çikolata", "35"], ["Cips", "30"], ["Meyve Suyu", "35"]].map(([name, price]) => (
                      <Button key={name} variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => setChargeForm((p) => ({ ...p, description: `Minibar - ${name}`, amount: price }))}>
                        {name} ({price}₺)
                      </Button>
                    ))}
                  </>
                )}
                {chargeForm.category === "Spa & Wellness" && (
                  <>
                    {[["Masaj 60dk", "400"], ["Masaj 90dk", "550"], ["Hamam", "300"], ["Sauna", "150"], ["Yüz Bakımı", "350"]].map(([name, price]) => (
                      <Button key={name} variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => setChargeForm((p) => ({ ...p, description: `Spa - ${name}`, amount: price }))}>
                        {name} ({price}₺)
                      </Button>
                    ))}
                  </>
                )}
                {chargeForm.category === "Restoran" && (
                  <>
                    {[["Kahvaltı", "180"], ["Öğle Yemeği", "250"], ["Akşam Yemeği", "350"], ["Bar", "120"]].map(([name, price]) => (
                      <Button key={name} variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => setChargeForm((p) => ({ ...p, description: `Restoran - ${name}`, amount: price }))}>
                        {name} ({price}₺)
                      </Button>
                    ))}
                  </>
                )}
                {chargeForm.category === "Oda Servisi" && (
                  <>
                    {[["Kahvaltı", "150"], ["Sandviç", "90"], ["Çay/Kahve", "40"], ["Gece Menüsü", "200"]].map(([name, price]) => (
                      <Button key={name} variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => setChargeForm((p) => ({ ...p, description: `Oda Servisi - ${name}`, amount: price }))}>
                        {name} ({price}₺)
                      </Button>
                    ))}
                  </>
                )}
                {chargeForm.category === "Çamaşırhane" && (
                  <>
                    {[["Gömlek", "40"], ["Pantolon", "50"], ["Elbise", "80"], ["Takım Elbise", "120"], ["Ekspres", "200"]].map(([name, price]) => (
                      <Button key={name} variant="outline" size="sm" className="text-xs h-7"
                        onClick={() => setChargeForm((p) => ({ ...p, description: `Çamaşırhane - ${name}`, amount: price }))}>
                        {name} ({price}₺)
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Açıklama</label>
              <Input
                placeholder="Masraf açıklaması"
                value={chargeForm.description}
                onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tutar (₺)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>İptal</Button>
            <Button onClick={handleAddCharge} disabled={!chargeForm.description || !chargeForm.amount}>
              <Plus className="mr-1 h-4 w-4" />
              Masraf Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================
          PAYMENT DIALOG
          ======================== */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ödeme Al
            </DialogTitle>
            <DialogDescription>
              {selectedFolio?.guestName} — Bakiye: {currentCalc ? formatCurrency(currentCalc.balance) : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ödeme Yöntemi</label>
              <Select
                value={paymentForm.method}
                onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tutar (₺)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                />
                {currentCalc && currentCalc.balance > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => setPaymentForm((p) => ({ ...p, amount: currentCalc.balance.toFixed(2) }))}
                  >
                    Tam Bakiye
                  </Button>
                )}
              </div>
            </div>
            {(paymentForm.method === "credit_card" || paymentForm.method === "bank_transfer") && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Referans No</label>
                <Input
                  placeholder="İşlem referansı"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>İptal</Button>
            <Button onClick={handleAddPayment} disabled={!paymentForm.amount}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Ödeme Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================
          CHECKOUT DIALOG
          ======================== */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          {selectedFolio && currentCalc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  Checkout — {selectedFolio.guestName}
                </DialogTitle>
                <DialogDescription>
                  Oda {selectedFolio.roomNumber} &middot; {selectedFolio.id} &middot;{" "}
                  {formatDate(selectedFolio.checkIn)} → {formatDate(selectedFolio.checkOut)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary by category */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Kategori Bazlı Özet</h4>
                  <div className="space-y-1.5">
                    {Object.entries(
                      selectedFolio.items
                        .filter((i) => i.type === "charge")
                        .reduce<Record<string, number>>((acc, item) => {
                          acc[item.category] = (acc[item.category] || 0) + item.amount;
                          return acc;
                        }, {})
                    ).map(([cat, total]) => (
                      <div key={cat} className="flex justify-between text-sm rounded-lg border px-3 py-2">
                        <span>{cat}</span>
                        <span className="font-medium">{formatCurrency(total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Financial summary */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ara Toplam</span>
                    <span className="font-medium">{formatCurrency(currentCalc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>KDV (%{KDV_RATE * 100})</span>
                    <span className="font-medium">{formatCurrency(currentCalc.kdv)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Genel Toplam</span>
                    <span>{formatCurrency(currentCalc.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Ödenen</span>
                    <span>-{formatCurrency(currentCalc.payments)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Kalan Bakiye</span>
                    <span className={currentCalc.balance > 0 ? "text-destructive" : "text-emerald-600"}>
                      {formatCurrency(currentCalc.balance)}
                    </span>
                  </div>
                </div>

                {currentCalc.balance > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20">
                    ⚠ Misafirin {formatCurrency(currentCalc.balance)} açık bakiyesi var. Checkout öncesi ödeme alınması önerilir.
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckoutOpen(false)}>İptal</Button>
                {currentCalc.balance > 0 && (
                  <Button variant="outline" onClick={() => { setCheckoutOpen(false); setPaymentOpen(true); }}>
                    <CreditCard className="mr-1 h-4 w-4" />
                    Önce Ödeme Al
                  </Button>
                )}
                <Button
                  disabled={currentCalc.balance > 0.01 || checkoutProcessing}
                  onClick={async () => {
                    if (currentCalc.balance > 0.01) return;
                    setCheckoutProcessing(true);
                    try {
                      // 1) Print invoice
                      handlePrintInvoice();
                      // 2) Update reservation status
                      const resAll = await getReservations();
                      const matchedRes = resAll.find((r) => r.confirmationNumber === selectedFolio.reservationId);
                      if (matchedRes) {
                        await updateReservation(matchedRes.id, { status: "checked-out" });
                        // 3) Update room status to vacant-dirty
                        if (matchedRes.room) {
                          await updateRoom(matchedRes.room.id, { status: "vacant-dirty", housekeepingStatus: "dirty" });
                          clearRoomGuest(matchedRes.room.number);
                        }
                      }
                      // 4) Update local folio status
                      setFolios((prev) =>
                        prev.map((f) => f.id === selectedFolio.id ? { ...f, status: "checked-out" } : f)
                      );
                      setCheckoutOpen(false);
                    } catch (e) {
                      console.error("Checkout failed:", e);
                    }
                    setCheckoutProcessing(false);
                  }}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  {checkoutProcessing ? "İşleniyor..." : currentCalc.balance > 0.01 ? "Bakiye kapatılmalı" : "Checkout & Settle"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================
          INVOICE PDF TEMPLATE (Hidden)
          ======================== */}
      <div className="hidden">
        <div ref={invoiceRef}>
          {selectedFolio && currentCalc && (
            <div>
              <div className="header">
                <div>
                  <div className="hotel-name">CREATIVE</div>
                  <div className="hotel-sub">Hotel &amp; Resort</div>
                  <div className="hotel-sub">İstanbul, Türkiye &middot; Tel: +90 212 555 0000</div>
                </div>
                <div>
                  <div className="invoice-title">FATURA</div>
                  <div className="invoice-meta">
                    Fatura No: INV-{selectedFolio.id.replace("FOL-", "")}<br />
                    Tarih: {formatDate(fmt(today))}<br />
                    Folio: {selectedFolio.id}
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">Misafir Bilgileri</div>
                <div className="info-grid">
                  <div className="info-row"><span className="info-label">Misafir:</span><span className="info-value">{selectedFolio.guestName}</span></div>
                  <div className="info-row"><span className="info-label">Oda:</span><span className="info-value">{selectedFolio.roomNumber}</span></div>
                  <div className="info-row"><span className="info-label">Giriş:</span><span className="info-value">{formatDate(selectedFolio.checkIn)}</span></div>
                  <div className="info-row"><span className="info-label">Çıkış:</span><span className="info-value">{formatDate(selectedFolio.checkOut)}</span></div>
                  <div className="info-row"><span className="info-label">Gece:</span><span className="info-value">{selectedFolio.nights}</span></div>
                  <div className="info-row"><span className="info-label">Rezervasyon:</span><span className="info-value">{selectedFolio.reservationId}</span></div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">Hesap Detayı</div>
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Açıklama</th>
                      <th>Kategori</th>
                      <th style={{ textAlign: "right" }}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFolio.items.map((item) => (
                      <tr key={item.id} className={item.type === "payment" ? "payment-row" : ""}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.description}</td>
                        <td>{item.category}</td>
                        <td style={{ textAlign: "right" }}>
                          {item.type === "payment" ? `-${formatCurrency(Math.abs(item.amount))}` : formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="totals">
                <div className="total-row">
                  <span>Ara Toplam:</span>
                  <span>{formatCurrency(currentCalc.subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>KDV (%{KDV_RATE * 100}):</span>
                  <span>{formatCurrency(currentCalc.kdv)}</span>
                </div>
                <div className="total-row grand">
                  <span>Genel Toplam:</span>
                  <span>{formatCurrency(currentCalc.grandTotal)}</span>
                </div>
                <div className="total-row" style={{ color: "#059669" }}>
                  <span>Ödenen:</span>
                  <span>-{formatCurrency(currentCalc.payments)}</span>
                </div>
                <div className="total-row grand">
                  <span>Bakiye:</span>
                  <span>{formatCurrency(currentCalc.balance)}</span>
                </div>
              </div>

              <div className="footer">
                <p>Creative — Bu belge bilgisayar ortamında oluşturulmuştur.</p>
                <p>Vergi No: 1234567890 &middot; Ticaret Sicil No: 123456</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
