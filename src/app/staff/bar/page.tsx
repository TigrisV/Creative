"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStaff } from "../staff-context";
import type { BarMenuItem, BarOrder, BarOrderItem, Room } from "@/lib/types";
import { getBarMenu, getBarOrders, createBarOrder, updateBarOrder } from "@/lib/staff-service";
import { getRoomsWithGuests } from "@/lib/data-service";
import { createNotification } from "@/lib/notification-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Plus, Minus, ShoppingCart, Wine, Coffee, Beer, UtensilsCrossed,
  Cookie, IceCream, Package, Send, CheckCircle2, Clock, ChefHat,
  Truck, X, RefreshCw, Loader2, ArrowLeft, ArrowRight, User,
  BedDouble, Search, AlertCircle,
} from "lucide-react";

const categoryConfig: Record<string, { label: string; icon: typeof Coffee }> = {
  "sicak-icecek": { label: "Sıcak İçecek", icon: Coffee },
  "soguk-icecek": { label: "Soğuk İçecek", icon: Wine },
  "alkol": { label: "Alkollü", icon: Beer },
  "atistirmalik": { label: "Atıştırmalık", icon: Cookie },
  "yemek": { label: "Yemek", icon: UtensilsCrossed },
  "tatli": { label: "Tatlı", icon: IceCream },
  "diger": { label: "Diğer", icon: Package },
};

const orderStatusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  new: { label: "Yeni", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  preparing: { label: "Hazırlanıyor", icon: ChefHat, color: "text-amber-600", bg: "bg-amber-50" },
  ready: { label: "Hazır", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  delivered: { label: "Teslim Edildi", icon: Truck, color: "text-gray-500", bg: "bg-gray-50" },
  cancelled: { label: "İptal", icon: X, color: "text-red-500", bg: "bg-red-50" },
};

function formatTRY(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(n);
}

type POSStep = "menu" | "room" | "confirm" | "done";

export default function BarStaffPage() {
  const { staff } = useStaff();
  const [menu, setMenu] = useState<BarMenuItem[]>([]);
  const [orders, setOrders] = useState<BarOrder[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [refreshing, setRefreshing] = useState(false);

  // POS flow state
  const [posOpen, setPosOpen] = useState(false);
  const [posStep, setPosStep] = useState<POSStep>("menu");
  const [cart, setCart] = useState<BarOrderItem[]>([]);
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestVerified, setGuestVerified] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [menuFilter, setMenuFilter] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<BarOrder | null>(null);

  const loadData = async () => {
    try {
      const [m, o, r] = await Promise.all([getBarMenu(), getBarOrders(), getRoomsWithGuests()]);
      setMenu(m);
      setOrders(o);
      setRooms(r);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(() => {
      getBarOrders().then(setOrders).catch(() => {});
      getRoomsWithGuests().then(setRooms).catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const activeOrders = useMemo(() =>
    orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled"),
  [orders]);

  const pastOrders = useMemo(() =>
    orders.filter((o) => o.status === "delivered" || o.status === "cancelled").slice(0, 20),
  [orders]);

  const filteredMenu = useMemo(() => {
    let items = menuFilter === "all" ? menu : menu.filter((m) => m.category === menuFilter);
    if (menuSearch) {
      items = items.filter((m) => m.name.toLowerCase().includes(menuSearch.toLowerCase()));
    }
    return items;
  }, [menu, menuFilter, menuSearch]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  // Find guest from room number
  const lookupGuest = (rn: string) => {
    const room = rooms.find((r) => r.number === rn);
    if (room?.currentGuest) {
      setGuestName(`${room.currentGuest.firstName} ${room.currentGuest.lastName}`);
      setGuestVerified(true);
    } else {
      setGuestName("");
      setGuestVerified(false);
    }
  };

  const addToCart = (item: BarMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c);
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !roomNumber) return;
    setSubmitting(true);
    try {
      const newOrder = await createBarOrder({
        roomNumber,
        guestName: guestName || undefined,
        orderType: "room-service",
        status: "new",
        items: cart,
        totalAmount: cartTotal,
        paymentMethod: "room-charge",
        notes: orderNotes || undefined,
        createdBy: staff.id,
        createdByName: staff.name,
      });
      setOrders((prev) => [newOrder, ...prev]);
      setLastOrder(newOrder);
      setPosStep("done");

      // Notify reception
      createNotification({
        type: "payment",
        title: `Bar Siparişi — Oda ${roomNumber}`,
        description: `${formatTRY(cartTotal)} tutarında sipariş odaya yazıldı (${staff.name})`,
        roomNumber,
      }).catch(() => {});
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleStatusChange = async (order: BarOrder, newStatus: string) => {
    const updates: Partial<BarOrder> = { status: newStatus as BarOrder["status"] };
    if (newStatus === "delivered") updates.deliveredAt = new Date().toISOString();
    await updateBarOrder(order.id, updates);
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, ...updates } : o));
  };

  const openPOS = () => {
    setCart([]);
    setRoomNumber("");
    setGuestName("");
    setGuestVerified(false);
    setOrderNotes("");
    setMenuFilter("all");
    setMenuSearch("");
    setLastOrder(null);
    setPosStep("menu");
    setPosOpen(true);
  };

  const closePOS = () => {
    setPosOpen(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // ═══════════════════════════════════════════════════════
  // POS SCREEN (full-screen overlay)
  // ═══════════════════════════════════════════════════════
  if (posOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-57px)] bg-gray-50">
        {/* POS Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
          <div className="flex items-center gap-3">
            {posStep !== "done" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={posStep === "menu" ? closePOS : () => setPosStep(posStep === "confirm" ? "room" : "menu")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="text-sm font-bold">
                {posStep === "menu" && "Menüden Seçin"}
                {posStep === "room" && "Oda Bilgisi"}
                {posStep === "confirm" && "Sipariş Onayı"}
                {posStep === "done" && "Sipariş Tamamlandı"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {(["menu", "room", "confirm", "done"] as POSStep[]).map((s, i) => (
                  <div key={s} className={cn("h-1 rounded-full transition-all",
                    s === posStep ? "w-8 bg-amber-500" :
                    (["menu", "room", "confirm", "done"].indexOf(s) < ["menu", "room", "confirm", "done"].indexOf(posStep)) ? "w-4 bg-amber-300" : "w-4 bg-gray-200"
                  )} />
                ))}
              </div>
            </div>
          </div>
          {cart.length > 0 && posStep === "menu" && (
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white">{cart.reduce((s, i) => s + i.quantity, 0)} ürün</Badge>
              <span className="text-sm font-bold text-amber-600">{formatTRY(cartTotal)}</span>
            </div>
          )}
        </div>

        {/* ──── STEP: MENU ──── */}
        {posStep === "menu" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Ürün ara..."
                  value={menuSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMenuSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            {/* Categories */}
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-thin">
              <Button size="sm" variant={menuFilter === "all" ? "default" : "outline"} className="text-[10px] h-7 px-2.5 shrink-0" onClick={() => setMenuFilter("all")}>Tümü</Button>
              {Object.entries(categoryConfig).map(([key, cfg]) => (
                <Button key={key} size="sm" variant={menuFilter === key ? "default" : "outline"} className="text-[10px] h-7 px-2.5 shrink-0" onClick={() => setMenuFilter(key)}>
                  <cfg.icon className="h-3 w-3 mr-0.5" /> {cfg.label}
                </Button>
              ))}
            </div>
            {/* Menu grid */}
            <div className="flex-1 overflow-auto px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {filteredMenu.map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id);
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        "text-left rounded-xl border p-3 transition-all active:scale-[0.97]",
                        inCart ? "border-amber-400 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                      onClick={() => addToCart(item)}
                    >
                      <p className="text-[12px] font-semibold leading-tight">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{categoryConfig[item.category]?.label}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[13px] font-bold text-amber-600">{formatTRY(item.price)}</span>
                        {inCart && (
                          <div className="flex items-center gap-1">
                            <button
                              className="h-6 w-6 rounded-full border flex items-center justify-center bg-white active:bg-gray-100"
                              onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, -1); }}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">{inCart.quantity}</span>
                            <button
                              className="h-6 w-6 rounded-full border flex items-center justify-center bg-white active:bg-gray-100"
                              onClick={(e) => { e.stopPropagation(); updateCartQty(item.id, 1); }}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Cart summary + next */}
            {cart.length > 0 && (
              <div className="px-3 pb-3 pt-2 bg-white border-t">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold flex-1">Sepet ({cart.reduce((s, i) => s + i.quantity, 0)} ürün)</span>
                  <span className="text-sm font-bold text-amber-600">{formatTRY(cartTotal)}</span>
                </div>
                <Button className="w-full h-11 bg-amber-500 hover:bg-amber-600 font-semibold" onClick={() => setPosStep("room")}>
                  Devam — Oda Seç <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ──── STEP: ROOM ──── */}
        {posStep === "room" && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Oda Numarası</label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      placeholder="Örn: 201"
                      value={roomNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRoomNumber(e.target.value);
                        setGuestVerified(false);
                        setGuestName("");
                      }}
                      className="h-12 text-lg font-bold text-center"
                      autoFocus
                    />
                    <Button
                      className="h-12 px-4"
                      disabled={!roomNumber}
                      onClick={() => lookupGuest(roomNumber)}
                    >
                      <Search className="h-4 w-4 mr-1" /> Sorgula
                    </Button>
                  </div>
                </div>

                {/* Guest result */}
                {roomNumber && guestVerified && guestName && (
                  <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">{guestName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <BedDouble className="h-3 w-3 text-emerald-600" />
                          <span className="text-xs text-emerald-700">Oda {roomNumber}</span>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-1" />
                          <span className="text-[10px] text-emerald-600 font-medium">Doğrulandı</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {roomNumber && !guestVerified && rooms.find((r) => r.number === roomNumber) && !rooms.find((r) => r.number === roomNumber)?.currentGuest && (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Oda {roomNumber} şu an boş</p>
                        <p className="text-[11px] text-amber-600">Bu odada konaklayan misafir bulunamadı</p>
                      </div>
                    </div>
                  </div>
                )}

                {roomNumber && !rooms.find((r) => r.number === roomNumber) && roomNumber.length >= 2 && (
                  <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-sm font-medium text-red-800">Oda {roomNumber} bulunamadı</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Sipariş Notu (opsiyonel)</label>
                  <Textarea
                    placeholder="Özel istek, alerji bilgisi vb."
                    value={orderNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrderNotes(e.target.value)}
                    className="mt-1.5 text-sm min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Next */}
            <Button
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 font-semibold text-base"
              disabled={!roomNumber || !guestVerified}
              onClick={() => setPosStep("confirm")}
            >
              Siparişi Onayla <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}

        {/* ──── STEP: CONFIRM ──── */}
        {posStep === "confirm" && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Guest info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <BedDouble className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Oda {roomNumber}</p>
                    <p className="text-xs text-muted-foreground">{guestName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order items */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sipariş Detayı</p>
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center text-[10px]">{item.quantity}</Badge>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatTRY(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-base font-bold">Toplam</span>
                  <span className="text-base font-bold text-amber-600">{formatTRY(cartTotal)}</span>
                </div>
                {orderNotes && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">Not: {orderNotes}</p>
                )}
              </CardContent>
            </Card>

            {/* Room charge notice */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <p className="text-[11px] text-blue-700 font-medium">
                Bu tutar misafirin oda hesabına yazılacak ve check-out sırasında tahsil edilecektir.
              </p>
            </div>

            {/* Submit */}
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold text-base"
              disabled={submitting}
              onClick={handleSubmitOrder}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> İşleniyor...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Siparişi Onayla — {formatTRY(cartTotal)}</>
              )}
            </Button>
          </div>
        )}

        {/* ──── STEP: DONE ──── */}
        {posStep === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-1">Sipariş Alındı!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Oda {roomNumber} • {guestName} • {formatTRY(cartTotal)}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Tutar misafirin oda hesabına yazıldı
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 px-6" onClick={closePOS}>
                Siparişlere Dön
              </Button>
              <Button className="h-11 px-6 bg-amber-500 hover:bg-amber-600" onClick={openPOS}>
                <Plus className="h-4 w-4 mr-1" /> Yeni Sipariş
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ORDERS LIST (main screen)
  // ═══════════════════════════════════════════════════════
  const OrderCard = ({ order }: { order: BarOrder }) => {
    const sc = orderStatusConfig[order.status] || orderStatusConfig.new;
    const nextStatus: Record<string, string> = { new: "preparing", preparing: "ready", ready: "delivered" };
    const next = nextStatus[order.status];
    return (
      <Card className="overflow-hidden">
        <div className={cn("px-3 py-1.5 flex items-center justify-between", sc.bg)}>
          <div className="flex items-center gap-1.5">
            <sc.icon className={cn("h-3.5 w-3.5", sc.color)} />
            <span className={cn("text-[11px] font-semibold", sc.color)}>{sc.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {new Date(order.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                {order.roomNumber && <Badge variant="outline" className="text-[10px] px-1.5">Oda {order.roomNumber}</Badge>}
                <Badge variant="secondary" className="text-[10px] px-1.5">Oda Hesabı</Badge>
              </div>
              {order.guestName && <p className="text-[11px] text-muted-foreground mt-0.5">{order.guestName}</p>}
            </div>
            <span className="text-sm font-bold">{formatTRY(order.totalAmount)}</span>
          </div>
          <div className="space-y-0.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span>{item.quantity}x {item.name}</span>
                <span className="text-muted-foreground">{formatTRY(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">Not: {order.notes}</p>
          )}
          {next && (
            <Button
              size="sm"
              className={cn("w-full h-9 text-xs",
                next === "preparing" && "bg-amber-500 hover:bg-amber-600",
                next === "ready" && "bg-emerald-500 hover:bg-emerald-600",
                next === "delivered" && "bg-blue-500 hover:bg-blue-600",
              )}
              onClick={() => handleStatusChange(order, next)}
            >
              {next === "preparing" && <><ChefHat className="h-3.5 w-3.5 mr-1" /> Hazırlamaya Başla</>}
              {next === "ready" && <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Hazır</>}
              {next === "delivered" && <><Truck className="h-3.5 w-3.5 mr-1" /> Teslim Edildi</>}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-white border-b">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{activeOrders.filter((o) => o.status === "new").length}</div>
          <div className="text-[10px] text-muted-foreground">Yeni</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{activeOrders.filter((o) => o.status === "preparing").length}</div>
          <div className="text-[10px] text-muted-foreground">Hazırlanıyor</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{activeOrders.filter((o) => o.status === "ready").length}</div>
          <div className="text-[10px] text-muted-foreground">Hazır</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-3 pt-2 bg-white border-b flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="orders" className="text-xs px-3">Aktif ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-3">Geçmiş</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600" onClick={openPOS}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Yeni Sipariş
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="orders" className="p-3 space-y-2 mt-0">
            {activeOrders.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aktif sipariş yok</p>
                <Button size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600" onClick={openPOS}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Yeni Sipariş Al
                </Button>
              </div>
            ) : activeOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </TabsContent>

          <TabsContent value="history" className="p-3 space-y-2 mt-0">
            {pastOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Geçmiş sipariş yok</div>
            ) : pastOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
