"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getRatePlans, createRatePlan, updateRatePlan, deleteRatePlan,
  getSpecialOffers, createSpecialOffer, updateSpecialOffer, deleteSpecialOffer,
  seasonLabels, seasonColors, BASE_RATES,
  type RatePlan, type SeasonType, type SpecialOffer,
} from "@/lib/rate-service";
import { formatCurrency, cn } from "@/lib/utils";
import type { RoomType } from "@/lib/types";
import {
  Calendar, Plus, Trash2, Edit2, Sun, Snowflake, Flame, Zap, Star,
  TrendingUp, Tag, Percent, Clock, Check,
} from "lucide-react";

const roomTypeLabels: Record<RoomType, string> = {
  standard: "Standart", deluxe: "Deluxe", suite: "Süit",
  family: "Aile", king: "King", twin: "Twin",
};

const seasonIcons: Record<SeasonType, typeof Sun> = {
  low: Snowflake, mid: Sun, high: Flame, peak: Zap, special: Star,
};

const offerTypeLabels: Record<string, string> = {
  "early-bird": "Erken Rezervasyon",
  "last-minute": "Son Dakika",
  "long-stay": "Uzun Konaklama",
  "weekend": "Hafta Sonu",
  "corporate": "Kurumsal",
  "custom": "Özel",
};

export default function RatePlansPage() {
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [tab, setTab] = useState<"plans" | "offers">("plans");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);

  // Plan form
  const [pName, setPName] = useState("");
  const [pSeason, setPSeason] = useState<SeasonType>("mid");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [pMinStay, setPMinStay] = useState(1);
  const [pPriority, setPPriority] = useState(5);
  const [pRates, setPRates] = useState<Record<RoomType, number>>({ ...BASE_RATES });

  // Offer form
  const [oName, setOName] = useState("");
  const [oType, setOType] = useState("early-bird");
  const [oDiscount, setODiscount] = useState(10);
  const [oStart, setOStart] = useState("");
  const [oEnd, setOEnd] = useState("");
  const [oMinDays, setOMinDays] = useState(30);
  const [oMaxDays, setOMaxDays] = useState(3);
  const [oMinNights, setOMinNights] = useState(7);

  useEffect(() => {
    setPlans(getRatePlans());
    setOffers(getSpecialOffers());
  }, []);

  const reload = () => {
    setPlans(getRatePlans());
    setOffers(getSpecialOffers());
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPName(""); setPSeason("mid"); setPStart(""); setPEnd("");
    setPMinStay(1); setPPriority(5); setPRates({ ...BASE_RATES });
    setShowPlanDialog(true);
  };

  const openEditPlan = (p: RatePlan) => {
    setEditingPlan(p);
    setPName(p.name); setPSeason(p.seasonType); setPStart(p.startDate); setPEnd(p.endDate);
    setPMinStay(p.minStay); setPPriority(p.priority); setPRates({ ...p.rates });
    setShowPlanDialog(true);
  };

  const savePlan = () => {
    if (!pName || !pStart || !pEnd) return;
    if (editingPlan) {
      updateRatePlan(editingPlan.id, {
        name: pName, seasonType: pSeason, startDate: pStart, endDate: pEnd,
        minStay: pMinStay, priority: pPriority, rates: pRates,
      });
    } else {
      createRatePlan({
        name: pName, seasonType: pSeason, startDate: pStart, endDate: pEnd,
        minStay: pMinStay, priority: pPriority, rates: pRates, isActive: true,
      });
    }
    setShowPlanDialog(false);
    reload();
  };

  const handleDeletePlan = (id: string) => {
    if (!confirm("Bu fiyat planını silmek istediğinize emin misiniz?")) return;
    deleteRatePlan(id);
    reload();
  };

  const togglePlanActive = (id: string, current: boolean) => {
    updateRatePlan(id, { isActive: !current });
    reload();
  };

  const saveOffer = () => {
    if (!oName || !oStart || !oEnd) return;
    const conditions: any = {};
    if (oType === "early-bird") conditions.minDaysBefore = oMinDays;
    if (oType === "last-minute") conditions.maxDaysBefore = oMaxDays;
    if (oType === "long-stay") conditions.minNights = oMinNights;

    createSpecialOffer({
      name: oName, type: oType as any, discountPercent: oDiscount,
      conditions, startDate: oStart, endDate: oEnd, isActive: true,
    });
    setShowOfferDialog(false);
    reload();
  };

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fiyat Yönetimi</h1>
          <p className="text-[13px] text-muted-foreground">Sezonluk fiyatlandırma ve özel teklifler</p>
        </div>
        <div className="flex gap-2">
          {tab === "plans" && (
            <Button size="sm" onClick={openNewPlan}><Plus className="mr-1.5 h-3.5 w-3.5" />Yeni Plan</Button>
          )}
          {tab === "offers" && (
            <Button size="sm" onClick={() => {
              setOName(""); setOType("early-bird"); setODiscount(10);
              setOStart(today); setOEnd(`${new Date().getFullYear()}-12-31`);
              setShowOfferDialog(true);
            }}><Plus className="mr-1.5 h-3.5 w-3.5" />Yeni Teklif</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab("plans")} className={cn(
          "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors",
          tab === "plans" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Calendar className="inline mr-1.5 h-3.5 w-3.5" />Sezon Planları ({plans.length})
        </button>
        <button onClick={() => setTab("offers")} className={cn(
          "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors",
          tab === "offers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Tag className="inline mr-1.5 h-3.5 w-3.5" />Özel Teklifler ({offers.length})
        </button>
      </div>

      {/* Sezon Planları */}
      {tab === "plans" && (
        <div className="space-y-3">
          {plans.length === 0 && (
            <div className="text-center py-10 text-[13px] text-muted-foreground">Henüz fiyat planı oluşturulmamış</div>
          )}
          {plans.map((plan) => {
            const SeasonIcon = seasonIcons[plan.seasonType];
            const isActive = plan.isActive && plan.endDate >= today;
            return (
              <Card key={plan.id} className={cn(!isActive && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        `bg-${seasonColors[plan.seasonType]}-50 text-${seasonColors[plan.seasonType]}-600`
                      )}>
                        <SeasonIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold">{plan.name}</h3>
                          <Badge variant={isActive ? "success" : "secondary"} className="text-[10px]">
                            {isActive ? "Aktif" : "Pasif"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {seasonLabels[plan.seasonType]}
                          </Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {new Date(plan.startDate).toLocaleDateString("tr-TR")} — {new Date(plan.endDate).toLocaleDateString("tr-TR")}
                          {plan.minStay > 1 && ` · Min ${plan.minStay} gece`}
                          {` · Öncelik: ${plan.priority}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePlanActive(plan.id, plan.isActive)}>
                        <Check className={cn("h-3.5 w-3.5", plan.isActive ? "text-green-600" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPlan(plan)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Fiyat grid */}
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {(Object.keys(roomTypeLabels) as RoomType[]).map((rt) => (
                      <div key={rt} className="rounded border border-border/50 p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{roomTypeLabels[rt]}</p>
                        <p className="text-[13px] font-bold">{formatCurrency(plan.rates[rt])}</p>
                        {plan.rates[rt] !== BASE_RATES[rt] && (
                          <p className={cn("text-[9px]", plan.rates[rt] > BASE_RATES[rt] ? "text-red-500" : "text-green-500")}>
                            {plan.rates[rt] > BASE_RATES[rt] ? "+" : ""}{Math.round(((plan.rates[rt] - BASE_RATES[rt]) / BASE_RATES[rt]) * 100)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Özel Teklifler */}
      {tab === "offers" && (
        <div className="space-y-3">
          {offers.length === 0 && (
            <div className="text-center py-10 text-[13px] text-muted-foreground">Henüz özel teklif oluşturulmamış</div>
          )}
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold">{offer.name}</h3>
                      <Badge variant={offer.isActive ? "success" : "secondary"} className="text-[10px]">
                        {offer.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{offerTypeLabels[offer.type] || offer.type}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      %{offer.discountPercent} indirim · {new Date(offer.startDate).toLocaleDateString("tr-TR")} — {new Date(offer.endDate).toLocaleDateString("tr-TR")}
                      {offer.conditions.minDaysBefore && ` · Min ${offer.conditions.minDaysBefore} gün önce`}
                      {offer.conditions.maxDaysBefore !== undefined && ` · Max ${offer.conditions.maxDaysBefore} gün kala`}
                      {offer.conditions.minNights && ` · Min ${offer.conditions.minNights} gece`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    updateSpecialOffer(offer.id, { isActive: !offer.isActive });
                    reload();
                  }}>
                    <Check className={cn("h-3.5 w-3.5", offer.isActive ? "text-green-600" : "text-muted-foreground")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                    deleteSpecialOffer(offer.id);
                    reload();
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Baz Fiyat Referansı */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px]">Baz Fiyatlar (Sezon planı olmayan dönem)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(roomTypeLabels) as RoomType[]).map((rt) => (
              <div key={rt} className="rounded border border-border/50 p-2 text-center bg-muted/30">
                <p className="text-[10px] text-muted-foreground">{roomTypeLabels[rt]}</p>
                <p className="text-[13px] font-bold">{formatCurrency(BASE_RATES[rt])}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{editingPlan ? "Planı Düzenle" : "Yeni Sezon Planı"}</DialogTitle>
            <DialogDescription className="text-[12px]">Tarih aralığı ve oda fiyatlarını belirleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Plan Adı</label>
                <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Yaz Sezonu" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Sezon Tipi</label>
                <Select value={pSeason} onValueChange={(v) => setPSeason(v as SeasonType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(seasonLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Başlangıç</label>
                <Input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Bitiş</label>
                <Input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Min. Konaklama</label>
                <Input type="number" min={1} value={pMinStay} onChange={(e) => setPMinStay(parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Öncelik (yüksek = baskın)</label>
                <Input type="number" min={1} value={pPriority} onChange={(e) => setPPriority(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <Separator />
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Gecelik Fiyatlar</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(roomTypeLabels) as RoomType[]).map((rt) => (
                <div key={rt} className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">{roomTypeLabels[rt]}</label>
                  <Input type="number" value={pRates[rt]} onChange={(e) => setPRates({ ...pRates, [rt]: parseInt(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPlanDialog(false)}>İptal</Button>
            <Button size="sm" onClick={savePlan} disabled={!pName || !pStart || !pEnd}>
              {editingPlan ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Yeni Özel Teklif</DialogTitle>
            <DialogDescription className="text-[12px]">İndirim koşullarını belirleyin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Teklif Adı</label>
              <Input value={oName} onChange={(e) => setOName(e.target.value)} placeholder="Erken Rezervasyon İndirimi" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Teklif Tipi</label>
                <Select value={oType} onValueChange={setOType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(offerTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">İndirim (%)</label>
                <Input type="number" min={1} max={90} value={oDiscount} onChange={(e) => setODiscount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Başlangıç</label>
                <Input type="date" value={oStart} onChange={(e) => setOStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Bitiş</label>
                <Input type="date" value={oEnd} onChange={(e) => setOEnd(e.target.value)} />
              </div>
            </div>
            {oType === "early-bird" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Minimum kaç gün önce rezervasyon</label>
                <Input type="number" min={1} value={oMinDays} onChange={(e) => setOMinDays(parseInt(e.target.value) || 1)} />
              </div>
            )}
            {oType === "last-minute" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Maximum kaç gün kala</label>
                <Input type="number" min={0} value={oMaxDays} onChange={(e) => setOMaxDays(parseInt(e.target.value) || 0)} />
              </div>
            )}
            {oType === "long-stay" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Minimum gece sayısı</label>
                <Input type="number" min={2} value={oMinNights} onChange={(e) => setOMinNights(parseInt(e.target.value) || 2)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowOfferDialog(false)}>İptal</Button>
            <Button size="sm" onClick={saveOffer} disabled={!oName || !oStart || !oEnd}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
