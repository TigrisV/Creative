"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStaff } from "../staff-context";
import type { MaintenanceOrder, MaintenanceCategory } from "@/lib/types";
import { getMaintenanceOrders, createMaintenanceOrder, updateMaintenanceOrder } from "@/lib/staff-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Wrench, Plus, CheckCircle2, Clock, AlertTriangle, Play,
  Pause, RefreshCw, Loader2, Zap, Droplets, Wind, Sofa,
  PaintBucket, Building, Waves, TreePine, Settings, HelpCircle,
  MapPin, Timer, ChevronRight,
} from "lucide-react";

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Acil", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medium: { label: "Normal", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  low: { label: "Düşük", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
};

const categoryConfig: Record<string, { label: string; icon: typeof Wrench }> = {
  elektrik: { label: "Elektrik", icon: Zap },
  tesisat: { label: "Tesisat", icon: Droplets },
  klima: { label: "Klima/HVAC", icon: Wind },
  mobilya: { label: "Mobilya", icon: Sofa },
  boya: { label: "Boya/Badana", icon: PaintBucket },
  asansor: { label: "Asansör", icon: Building },
  havuz: { label: "Havuz", icon: Waves },
  bahce: { label: "Bahçe", icon: TreePine },
  genel: { label: "Genel", icon: Settings },
  diger: { label: "Diğer", icon: HelpCircle },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Yeni", color: "text-blue-600", bg: "bg-blue-50" },
  assigned: { label: "Atandı", color: "text-purple-600", bg: "bg-purple-50" },
  in_progress: { label: "Devam Ediyor", color: "text-amber-600", bg: "bg-amber-50" },
  waiting_parts: { label: "Parça Bekleniyor", color: "text-orange-600", bg: "bg-orange-50" },
  completed: { label: "Tamamlandı", color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled: { label: "İptal", color: "text-gray-500", bg: "bg-gray-50" },
};

export default function MaintenanceStaffPage() {
  const { staff } = useStaff();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");
  const [refreshing, setRefreshing] = useState(false);

  // New order dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<MaintenanceCategory>("genel");
  const [newLocation, setNewLocation] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<MaintenanceOrder | null>(null);
  const [detailNotes, setDetailNotes] = useState("");
  const [detailParts, setDetailParts] = useState("");

  const loadData = async () => {
    try {
      const o = await getMaintenanceOrders();
      setOrders(o);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const refresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const myOrders = useMemo(() =>
    orders.filter((o) => (o.assignedToName === staff.name || o.assignedTo === staff.id) && o.status !== "completed" && o.status !== "cancelled")
      .sort((a, b) => {
        const prio = ["urgent", "high", "medium", "low"];
        return prio.indexOf(a.priority) - prio.indexOf(b.priority);
      }),
  [orders, staff]);

  const newOrders = useMemo(() =>
    orders.filter((o) => o.status === "new" && !o.assignedTo && !o.assignedToName),
  [orders]);

  const completedOrders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return orders.filter((o) => o.status === "completed" && o.completedAt?.startsWith(today));
  }, [orders]);

  const handleCreateOrder = async () => {
    if (!newTitle || !newLocation) return;
    setSubmitting(true);
    try {
      const created = await createMaintenanceOrder({
        title: newTitle, description: newDesc || undefined,
        category: newCategory, location: newLocation,
        roomNumber: newRoom || undefined, priority: newPriority,
        status: "new", reportedBy: staff.name,
      });
      setOrders((prev) => [created, ...prev]);
      setNewTitle(""); setNewDesc(""); setNewCategory("genel");
      setNewLocation(""); setNewRoom(""); setNewPriority("medium");
      setNewOpen(false);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleClaimOrder = async (order: MaintenanceOrder) => {
    await updateMaintenanceOrder(order.id, { assignedTo: staff.id, assignedToName: staff.name, status: "assigned" });
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, assignedTo: staff.id, assignedToName: staff.name, status: "assigned" } : o));
  };

  const handleStartOrder = async (order: MaintenanceOrder) => {
    const now = new Date().toISOString();
    await updateMaintenanceOrder(order.id, { status: "in_progress", startedAt: now });
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "in_progress", startedAt: now } : o));
    setSelected((s) => s && s.id === order.id ? { ...s, status: "in_progress", startedAt: now } : s);
  };

  const handleWaitingParts = async (order: MaintenanceOrder) => {
    await updateMaintenanceOrder(order.id, { status: "waiting_parts", notes: detailNotes || undefined });
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "waiting_parts", notes: detailNotes || undefined } : o));
    setSelected((s) => s && s.id === order.id ? { ...s, status: "waiting_parts" } : s);
  };

  const handleCompleteOrder = async (order: MaintenanceOrder) => {
    const now = new Date().toISOString();
    await updateMaintenanceOrder(order.id, {
      status: "completed", completedAt: now,
      notes: detailNotes || undefined,
      partsUsed: detailParts || undefined,
    });
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "completed", completedAt: now } : o));
    setDetailOpen(false);
  };

  const openDetail = (order: MaintenanceOrder) => {
    setSelected(order);
    setDetailNotes(order.notes || "");
    setDetailParts(order.partsUsed || "");
    setDetailOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const OrderCard = ({ order, showClaim }: { order: MaintenanceOrder; showClaim?: boolean }) => {
    const sc = statusConfig[order.status] || statusConfig.new;
    const pc = priorityConfig[order.priority] || priorityConfig.medium;
    const cc = categoryConfig[order.category] || categoryConfig.genel;
    const CatIcon = cc.icon;
    return (
      <Card className="cursor-pointer active:scale-[0.99] transition-transform" onClick={() => openDetail(order)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0">
              <CatIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold truncate pr-2">{order.title}</h3>
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 flex-shrink-0", pc.color)}>
                  {pc.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{order.location}</span>
                {order.roomNumber && <span className="text-[11px] text-muted-foreground">• Oda {order.roomNumber}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[10px] font-medium", sc.color)}>{sc.label}</span>
                <span className="text-[10px] text-muted-foreground">{cc.label}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-3" />
          </div>

          {order.description && (
            <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2 pl-[52px]">{order.description}</p>
          )}

          {showClaim && (
            <Button
              size="sm"
              className="w-full mt-2 h-8 text-xs bg-blue-500 hover:bg-blue-600"
              onClick={(e) => { e.stopPropagation(); handleClaimOrder(order); }}
            >
              <Wrench className="h-3.5 w-3.5 mr-1" /> Görevi Üstlen
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
          <div className="text-lg font-bold text-blue-600">{myOrders.length}</div>
          <div className="text-[10px] text-muted-foreground">Üzerimde</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{newOrders.length}</div>
          <div className="text-[10px] text-muted-foreground">Yeni Talep</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{completedOrders.length}</div>
          <div className="text-[10px] text-muted-foreground">Bugün Biten</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-3 pt-2 bg-white border-b flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="my" className="text-xs px-3">Görevlerim ({myOrders.length})</TabsTrigger>
            <TabsTrigger value="new" className="text-xs px-3">Yeni ({newOrders.length})</TabsTrigger>
            <TabsTrigger value="done" className="text-xs px-3">Bitmiş</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={() => setNewOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Arıza
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="my" className="p-3 space-y-2 mt-0">
            {myOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Üzerinize atanmış görev yok</div>
            ) : myOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </TabsContent>

          <TabsContent value="new" className="p-3 space-y-2 mt-0">
            {newOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Yeni arıza talebi yok</div>
            ) : newOrders.map((o) => <OrderCard key={o.id} order={o} showClaim />)}
          </TabsContent>

          <TabsContent value="done" className="p-3 space-y-2 mt-0">
            {completedOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Bugün tamamlanan iş yok</div>
            ) : completedOrders.map((o) => <OrderCard key={o.id} order={o} />)}
          </TabsContent>
        </div>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Yeni Arıza Bildirimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Arıza başlığı *" value={newTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)} className="h-10 text-sm" />

            <div className="grid grid-cols-2 gap-2">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as MaintenanceCategory)}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Kategori" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-sm">{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as typeof newPriority)}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Öncelik" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-sm">Düşük</SelectItem>
                  <SelectItem value="medium" className="text-sm">Normal</SelectItem>
                  <SelectItem value="high" className="text-sm">Yüksek</SelectItem>
                  <SelectItem value="urgent" className="text-sm">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Konum *" value={newLocation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLocation(e.target.value)} className="h-10 text-sm" />
              <Input placeholder="Oda No (opsiyonel)" value={newRoom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoom(e.target.value)} className="h-10 text-sm" />
            </div>

            <Textarea placeholder="Açıklama..." value={newDesc} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDesc(e.target.value)} className="text-sm min-h-[60px]" />

            <Button className="w-full h-11 bg-blue-500 hover:bg-blue-600" disabled={!newTitle || !newLocation || submitting} onClick={handleCreateOrder}>
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              {submitting ? "Gönderiliyor..." : "Arıza Bildir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const sc = statusConfig[selected.status] || statusConfig.new;
            const pc = priorityConfig[selected.priority] || priorityConfig.medium;
            const cc = categoryConfig[selected.category] || categoryConfig.genel;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Kategori</span>
                    <p className="font-medium">{cc.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Öncelik</span>
                    <Badge variant="outline" className={cn("text-[10px]", pc.color)}>{pc.label}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Konum</span>
                    <p className="font-medium">{selected.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Durum</span>
                    <p className={cn("font-medium text-sm", sc.color)}>{sc.label}</p>
                  </div>
                  {selected.roomNumber && <div><span className="text-muted-foreground text-xs">Oda</span><p className="font-medium">{selected.roomNumber}</p></div>}
                  {selected.reportedBy && <div><span className="text-muted-foreground text-xs">Bildiren</span><p className="font-medium">{selected.reportedBy}</p></div>}
                </div>

                {selected.description && (
                  <div className="rounded-md bg-slate-50 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{selected.description}</p>
                  </div>
                )}

                {(selected.status === "assigned" || selected.status === "in_progress" || selected.status === "waiting_parts") && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Not / Açıklama</label>
                      <Textarea value={detailNotes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetailNotes(e.target.value)} className="text-sm min-h-[50px]" placeholder="Yapılan işlem..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Kullanılan Malzeme</label>
                      <Input value={detailParts} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDetailParts(e.target.value)} className="h-9 text-sm" placeholder="Örn: 1x sigorta, 2x ampul" />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  {selected.status === "assigned" && (
                    <Button className="flex-1 h-10" onClick={() => handleStartOrder(selected)}>
                      <Play className="h-4 w-4 mr-1" /> Başla
                    </Button>
                  )}
                  {selected.status === "in_progress" && (
                    <>
                      <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => handleWaitingParts(selected)}>
                        <Pause className="h-3.5 w-3.5 mr-1" /> Parça Bekle
                      </Button>
                      <Button className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => handleCompleteOrder(selected)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tamamla
                      </Button>
                    </>
                  )}
                  {selected.status === "waiting_parts" && (
                    <Button className="flex-1 h-10" onClick={() => handleStartOrder(selected)}>
                      <Play className="h-4 w-4 mr-1" /> Devam Et
                    </Button>
                  )}
                  <Button variant="outline" className="h-10" onClick={() => setDetailOpen(false)}>Kapat</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
