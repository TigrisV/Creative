"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getGuests, createGuest, updateGuest, getReservations } from "@/lib/data-service";
import { Guest, CreditCardInfo, StayHistory, GuestTitle, GuestCategory, RoomPreferences, Reservation, MealPlan } from "@/lib/types";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  Globe,
  CreditCard,
  FileText,
  CalendarDays,
  MapPin,
  User,
  ShieldCheck,
  Heart,
  AlertCircle,
  Building2,
  Award,
  Clock,
  BedDouble,
  MessageSquare,
  ChevronRight,
  X,
  Edit3,
  Save,
  Tag,
  Utensils,
  Coffee,
  Wifi,
  Thermometer,
  Eye,
  Ban,
  Link2,
  Activity,
  BarChart3,
  Percent,
  Bell,
  Languages,
  Cake,
  Users,
  Printer,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

// ─── Label Maps ────────────────────────────────────────────────────────
const idTypeLabels: Record<string, string> = { "tc-kimlik": "T.C. Kimlik", passport: "Pasaport", "driver-license": "Ehliyet", other: "Diğer" };
const genderLabels: Record<string, string> = { male: "Erkek", female: "Kadın", other: "Diğer" };
const titleLabels: Record<string, string> = { mr: "Bay", mrs: "Bayan", ms: "Bn.", dr: "Dr.", prof: "Prof.", sir: "Sir", lady: "Lady", "": "—" };
const categoryLabels: Record<string, { label: string; color: string }> = {
  regular: { label: "Normal", color: "bg-slate-100 text-slate-700" },
  vip: { label: "VIP", color: "bg-amber-100 text-amber-700" },
  corporate: { label: "Kurumsal", color: "bg-blue-100 text-blue-700" },
  group: { label: "Grup", color: "bg-purple-100 text-purple-700" },
  loyalty: { label: "Sadık", color: "bg-emerald-100 text-emerald-700" },
  blacklist: { label: "Kara Liste", color: "bg-red-100 text-red-700" },
};
const tierLabels: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "text-orange-700 bg-orange-50" },
  silver: { label: "Silver", color: "text-slate-600 bg-slate-100" },
  gold: { label: "Gold", color: "text-amber-700 bg-amber-50" },
  platinum: { label: "Platinum", color: "text-cyan-700 bg-cyan-50" },
  diamond: { label: "Diamond", color: "text-violet-700 bg-violet-50" },
};
const cardBrandLogos: Record<string, { label: string; color: string }> = {
  visa: { label: "VISA", color: "text-blue-700 bg-blue-50" },
  mastercard: { label: "MC", color: "text-red-600 bg-red-50" },
  amex: { label: "AMEX", color: "text-indigo-700 bg-indigo-50" },
  troy: { label: "TROY", color: "text-emerald-700 bg-emerald-50" },
  other: { label: "KART", color: "text-gray-700 bg-gray-50" },
};
const stayStatusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "Tamamlandı", color: "bg-emerald-50 text-emerald-700" },
  "in-house": { label: "Konaklıyor", color: "bg-blue-50 text-blue-700" },
  cancelled: { label: "İptal", color: "bg-red-50 text-red-700" },
  "no-show": { label: "Gelmedi", color: "bg-amber-50 text-amber-700" },
};
const roomTypeLabels: Record<string, string> = { standard: "Standart", deluxe: "Deluxe", suite: "Süit", family: "Aile", king: "King", twin: "Twin" };
const floorLabels: Record<string, string> = { low: "Alt Kat", mid: "Orta Kat", high: "Üst Kat", any: "Fark Etmez" };
const bedLabels: Record<string, string> = { single: "Tek Kişilik", double: "Çift Kişilik", twin: "İkiz Yatak", king: "King", any: "Fark Etmez" };
const smokingLabels: Record<string, string> = { smoking: "Sigara İçilen", "non-smoking": "Sigara İçilmeyen", any: "Fark Etmez" };
const viewLabels: Record<string, string> = { sea: "Deniz", garden: "Bahçe", city: "Şehir", pool: "Havuz", any: "Fark Etmez" };
const pillowLabels: Record<string, string> = { soft: "Yumuşak", firm: "Sert", "memory-foam": "Visco", any: "Fark Etmez" };
const tempLabels: Record<string, string> = { cool: "Serin", warm: "Sıcak", standard: "Normal" };
const relationLabels: Record<string, string> = { spouse: "Eş", child: "Çocuk", parent: "Ebeveyn", colleague: "İş Arkadaşı", assistant: "Asistan", "travel-agent": "Seyahat Acentası", other: "Diğer" };

// ─── Helpers ───────────────────────────────────────────────────────────
function fmtDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return d; }
}
function calcAge(bd?: string) { if (!bd) return null; return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25)); }
function calcCompleteness(g: Guest): number {
  let filled = 0; let total = 0;
  const check = (v: unknown) => { total++; if (v && v !== "" && v !== "—") filled++; };
  check(g.firstName); check(g.lastName); check(g.email); check(g.phone); check(g.idNumber);
  check(g.nationality); check(g.gender); check(g.birthDate); check(g.address); check(g.city);
  check(g.country); check(g.idDocument); check(g.emergencyContact);
  check(g.preferences?.length); check(g.allergies?.length);
  check(g.companyName); check(g.notes); check(g.loyaltyNumber);
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

// ─── Detail Tab Type ───────────────────────────────────────────────────
type DetailTab = "personal" | "contact" | "id-card" | "room-pref" | "dietary" | "stays" | "loyalty" | "notes";
const detailTabs: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: "personal", label: "Kişisel", icon: User },
  { key: "contact", label: "İletişim", icon: Phone },
  { key: "id-card", label: "Kimlik & Kart", icon: ShieldCheck },
  { key: "room-pref", label: "Oda Tercihi", icon: BedDouble },
  { key: "dietary", label: "Diyet & Alerji", icon: Utensils },
  { key: "stays", label: "Konaklama", icon: CalendarDays },
  { key: "loyalty", label: "Sadakat", icon: Award },
  { key: "notes", label: "Notlar", icon: MessageSquare },
];

// ═════════════════════════════════════════════════════════════════════════
export default function GuestsPage() {
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => {
    try { setAllGuests(await getGuests()); } catch (e) { console.error("Misafirler yüklenemedi:", e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("personal");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [newStep, setNewStep] = useState(0);

  // Guest list report
  const [showGuestList, setShowGuestList] = useState(false);
  const [guestListData, setGuestListData] = useState<Reservation[]>([]);
  const [guestListLoading, setGuestListLoading] = useState(false);
  const [guestListFilter, setGuestListFilter] = useState<"in-house" | "arriving" | "departing" | "all">("in-house");

  const openGuestList = async () => {
    setShowGuestList(true);
    setGuestListLoading(true);
    try {
      const allRes = await getReservations();
      setGuestListData(allRes);
    } catch (e) { console.error("Rezervasyonlar yüklenemedi:", e); }
    finally { setGuestListLoading(false); }
  };

  const filteredGuestList = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    switch (guestListFilter) {
      case "in-house": return guestListData.filter((r) => r.status === "checked-in");
      case "arriving": return guestListData.filter((r) => r.checkIn === today && (r.status === "confirmed" || r.status === "pending"));
      case "departing": return guestListData.filter((r) => r.checkOut === today && r.status === "checked-in");
      case "all": return guestListData.filter((r) => r.status !== "cancelled" && r.status !== "no-show");
      default: return guestListData;
    }
  }, [guestListData, guestListFilter]);

  const printGuestList = () => {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) return;
    const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const filterLabel = ({ "in-house": "Konaklayan Misafirler", "arriving": "Bugün Giriş Yapacaklar", "departing": "Bugün Çıkış Yapacaklar", "all": "Tüm Aktif Rezervasyonlar" })[guestListFilter];
    const rows = filteredGuestList.map((r) =>
      `<tr>
        <td>${r.room?.number || "—"}</td>
        <td>${r.source || "Direkt"}</td>
        <td>1</td>
        <td>${(r.mealPlan || "BB").toUpperCase()}</td>
        <td>${r.adults + (r.children || 0)}</td>
        <td>${r.guest.firstName} ${r.guest.lastName}</td>
        <td>${r.checkIn ? new Date(r.checkIn).toLocaleDateString("tr-TR") : "—"}</td>
        <td>${r.checkOut ? new Date(r.checkOut).toLocaleDateString("tr-TR") : "—"}</td>
      </tr>`
    ).join("");
    printWin.document.write(`<!DOCTYPE html><html><head><title>Misafir Listesi</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Segoe UI", Tahoma, sans-serif; font-size: 11px; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 2px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1.5px solid #000; padding: 4px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: 700; font-size: 11px; }
        td { font-size: 11px; }
        .footer { margin-top: 16px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>Creative PMS — ${filterLabel}</h1>
      <div class="subtitle">Tarih: ${today} · Toplam: ${filteredGuestList.length} kayıt</div>
      <table>
        <thead><tr>
          <th>Oda</th><th>Ajenta</th><th>Oda Sayısı</th><th>Kahvaltı</th><th>Kişi Sayısı</th><th>İsim</th><th>Giriş</th><th>Çıkış</th>
        </tr></thead>
        <tbody>${rows || "<tr><td colspan='8' style='text-align:center;padding:20px;color:#999'>Kayıt bulunamadı</td></tr>"}</tbody>
      </table>
      <div class="footer"><span>Creative PMS v1.0</span><span>${today}</span></div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    printWin.document.close();
  };

  // New guest form
  const [nf, setNf] = useState({ title: "" as string, firstName: "", lastName: "", middleName: "", email: "", secondaryEmail: "", phone: "", secondaryPhone: "", idNumber: "", nationality: "TR", gender: "" as string, birthDate: "", birthPlace: "", language: "tr", city: "", country: "Türkiye", address: "", postalCode: "", companyName: "", taxNumber: "", companyContact: "", notes: "", category: "regular" as string });
  const [gPhoneCountry, setGPhoneCountry] = useState("TR");
  const [gEmailTouched, setGEmailTouched] = useState(false);
  const gPhoneOk = nf.phone ? isPhoneValid(nf.phone, gPhoneCountry) : true;
  const gEmailOk = nf.email ? isEmailValid(nf.email) : true;

  const filteredGuests = useMemo(() => allGuests.filter((g) => {
    const matchSearch = searchTerm === "" ||
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.phone.includes(searchTerm) ||
      g.idNumber.includes(searchTerm) ||
      (g.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = filterCategory === "all" || g.category === filterCategory;
    return matchSearch && matchCat;
  }), [allGuests, searchTerm, filterCategory]);

  // KPIs
  const vipCount = allGuests.filter((g) => g.vipLevel && g.vipLevel > 0).length;
  const inHouseCount = allGuests.filter((g) => g.stayHistory?.some((s) => s.status === "in-house")).length;
  const avgSpend = allGuests.length > 0 ? allGuests.reduce((s, g) => s + g.totalSpent, 0) / allGuests.length : 0;

  const openDetail = (guest: Guest) => { setSelectedGuest(guest); setDetailTab("personal"); setEditing(false); };

  const startEdit = () => { if (!selectedGuest) return; setEditForm({ ...selectedGuest }); setEditing(true); };
  const saveEdit = () => {
    if (!selectedGuest || !editForm) return;
    const updated = { ...selectedGuest, ...editForm, updatedAt: new Date().toISOString() };
    setAllGuests((prev) => prev.map((g) => g.id === updated.id ? updated : g));
    setSelectedGuest(updated);
    if (typeof updateGuest === "function") updateGuest(updated.id, editForm).catch(() => {});
    setEditing(false);
  };
  const cancelEdit = () => { setEditing(false); setEditForm({}); };

  const handleCreateGuest = () => {
    if (!nf.firstName || !nf.lastName) return;
    if (nf.phone && !gPhoneOk) return;
    if (nf.email && !gEmailOk) return;
    const newGuest: Guest = {
      id: `g-new-${Date.now()}`, title: (nf.title || undefined) as GuestTitle | undefined,
      firstName: nf.firstName, lastName: nf.lastName, middleName: nf.middleName || undefined,
      email: nf.email || `${nf.firstName.toLowerCase()}@email.com`,
      secondaryEmail: nf.secondaryEmail || undefined,
      phone: nf.phone ? formatFullPhone(nf.phone, gPhoneCountry) : "+90 5xx",
      secondaryPhone: nf.secondaryPhone || undefined,
      idNumber: nf.idNumber || "", nationality: nf.nationality,
      gender: (nf.gender || undefined) as Guest["gender"],
      birthDate: nf.birthDate || undefined, birthPlace: nf.birthPlace || undefined,
      language: nf.language || "tr", category: (nf.category || "regular") as GuestCategory,
      city: nf.city || undefined, country: nf.country || undefined,
      address: nf.address || undefined, postalCode: nf.postalCode || undefined,
      companyName: nf.companyName || undefined, taxNumber: nf.taxNumber || undefined,
      companyContact: nf.companyContact || undefined, notes: nf.notes || undefined,
      totalStays: 0, totalSpent: 0, createdAt: new Date().toISOString(),
    };
    createGuest(newGuest).then((saved) => setAllGuests((prev) => [saved, ...prev])).catch(console.error);
    setNf({ title: "", firstName: "", lastName: "", middleName: "", email: "", secondaryEmail: "", phone: "", secondaryPhone: "", idNumber: "", nationality: "TR", gender: "", birthDate: "", birthPlace: "", language: "tr", city: "", country: "Türkiye", address: "", postalCode: "", companyName: "", taxNumber: "", companyContact: "", notes: "", category: "regular" });
    setGPhoneCountry("TR"); setGEmailTouched(false); setNewStep(0); setShowNewGuest(false);
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3 w-3", i < rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />)}</div>;
  };

  // ─── Detail Panel Content ────────────────────────────────────────────
  const renderTab = () => {
    if (!selectedGuest) return null;
    const g = selectedGuest;
    const ef = editForm as Record<string, unknown>;
    const setEf = (key: string, val: unknown) => setEditForm((p) => ({ ...p, [key]: val }));

    switch (detailTab) {
      case "personal":
        return (
          <div className="space-y-4">
            <Section icon={User} title="Kişisel Bilgiler">
              <div className="grid grid-cols-3 gap-3">
                {editing ? (
                  <>
                    <Field label="Ünvan"><Select value={(ef.title as string) || ""} onValueChange={(v) => setEf("title", v)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent>{Object.entries(titleLabels).map(([k, v]) => <SelectItem key={k} value={k || "none"}>{v}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Ad"><Input className="h-8 text-[12px]" value={(ef.firstName as string) || ""} onChange={(e) => setEf("firstName", e.target.value)} /></Field>
                    <Field label="Soyad"><Input className="h-8 text-[12px]" value={(ef.lastName as string) || ""} onChange={(e) => setEf("lastName", e.target.value)} /></Field>
                    <Field label="İkinci Ad"><Input className="h-8 text-[12px]" value={(ef.middleName as string) || ""} onChange={(e) => setEf("middleName", e.target.value)} /></Field>
                    <Field label="Cinsiyet"><Select value={(ef.gender as string) || ""} onValueChange={(v) => setEf("gender", v)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent>{Object.entries(genderLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Doğum Tarihi"><Input type="date" className="h-8 text-[12px]" value={(ef.birthDate as string) || ""} onChange={(e) => setEf("birthDate", e.target.value)} /></Field>
                    <Field label="Doğum Yeri"><Input className="h-8 text-[12px]" value={(ef.birthPlace as string) || ""} onChange={(e) => setEf("birthPlace", e.target.value)} /></Field>
                    <Field label="Uyruk"><Input className="h-8 text-[12px]" value={(ef.nationality as string) || ""} onChange={(e) => setEf("nationality", e.target.value)} /></Field>
                    <Field label="Dil"><Input className="h-8 text-[12px]" value={(ef.language as string) || ""} onChange={(e) => setEf("language", e.target.value)} /></Field>
                  </>
                ) : (
                  <>
                    <InfoRow label="Ünvan" value={titleLabels[g.title || ""] || "—"} />
                    <InfoRow label="Ad" value={g.firstName} />
                    <InfoRow label="Soyad" value={g.lastName} />
                    {g.middleName && <InfoRow label="İkinci Ad" value={g.middleName} />}
                    {g.gender && <InfoRow label="Cinsiyet" value={genderLabels[g.gender]} />}
                    {g.birthDate && <InfoRow label="Doğum Tarihi" value={`${fmtDate(g.birthDate)} (${calcAge(g.birthDate)} yaş)`} />}
                    {g.birthPlace && <InfoRow label="Doğum Yeri" value={g.birthPlace} />}
                    <InfoRow label="Uyruk" value={g.nationality} />
                    <InfoRow label="Dil" value={g.language || "tr"} />
                  </>
                )}
              </div>
            </Section>
            <Section icon={Building2} title="Firma Bilgileri">
              <div className="grid grid-cols-3 gap-3">
                {editing ? (
                  <>
                    <Field label="Firma Adı"><Input className="h-8 text-[12px]" value={(ef.companyName as string) || ""} onChange={(e) => setEf("companyName", e.target.value)} /></Field>
                    <Field label="Vergi No"><Input className="h-8 text-[12px]" value={(ef.taxNumber as string) || ""} onChange={(e) => setEf("taxNumber", e.target.value)} /></Field>
                    <Field label="Firma İrtibat"><Input className="h-8 text-[12px]" value={(ef.companyContact as string) || ""} onChange={(e) => setEf("companyContact", e.target.value)} /></Field>
                  </>
                ) : (
                  <>
                    <InfoRow label="Firma Adı" value={g.companyName} />
                    <InfoRow label="Vergi No" value={g.taxNumber} />
                    <InfoRow label="Firma İrtibat" value={g.companyContact} />
                  </>
                )}
              </div>
            </Section>
            <Section icon={Tag} title="Kategori & Etiketler">
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <Select value={(ef.category as string) || "regular"} onValueChange={(v) => setEf("category", v)}>
                    <SelectTrigger className="h-8 w-40 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <>
                    {g.category && <Badge className={cn("text-[10px]", categoryLabels[g.category]?.color)}>{categoryLabels[g.category]?.label}</Badge>}
                    {g.vipLevel ? <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Star className="mr-1 h-3 w-3" />VIP {g.vipLevel}</Badge> : null}
                    {(g.tags || []).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </>
                )}
              </div>
            </Section>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <Section icon={Phone} title="Telefon & E-posta">
              <div className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <Field label="Telefon"><Input className="h-8 text-[12px]" value={(ef.phone as string) || ""} onChange={(e) => setEf("phone", e.target.value)} /></Field>
                    <Field label="İkinci Telefon"><Input className="h-8 text-[12px]" value={(ef.secondaryPhone as string) || ""} onChange={(e) => setEf("secondaryPhone", e.target.value)} /></Field>
                    <Field label="E-posta"><Input className="h-8 text-[12px]" value={(ef.email as string) || ""} onChange={(e) => setEf("email", e.target.value)} /></Field>
                    <Field label="İkinci E-posta"><Input className="h-8 text-[12px]" value={(ef.secondaryEmail as string) || ""} onChange={(e) => setEf("secondaryEmail", e.target.value)} /></Field>
                  </>
                ) : (
                  <>
                    <InfoRow label="Telefon" value={g.phone} />
                    {g.secondaryPhone && <InfoRow label="İkinci Telefon" value={g.secondaryPhone} />}
                    <InfoRow label="E-posta" value={g.email} />
                    {g.secondaryEmail && <InfoRow label="İkinci E-posta" value={g.secondaryEmail} />}
                  </>
                )}
              </div>
            </Section>
            <Section icon={MapPin} title="Adres">
              <div className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="col-span-2"><Field label="Adres"><Input className="h-8 text-[12px]" value={(ef.address as string) || ""} onChange={(e) => setEf("address", e.target.value)} /></Field></div>
                    <Field label="Şehir"><Input className="h-8 text-[12px]" value={(ef.city as string) || ""} onChange={(e) => setEf("city", e.target.value)} /></Field>
                    <Field label="Ülke"><Input className="h-8 text-[12px]" value={(ef.country as string) || ""} onChange={(e) => setEf("country", e.target.value)} /></Field>
                    <Field label="Posta Kodu"><Input className="h-8 text-[12px]" value={(ef.postalCode as string) || ""} onChange={(e) => setEf("postalCode", e.target.value)} /></Field>
                  </>
                ) : (
                  <>
                    <InfoRow label="Adres" value={g.address} full />
                    <InfoRow label="Şehir" value={g.city} />
                    <InfoRow label="Ülke" value={g.country} />
                    {g.postalCode && <InfoRow label="Posta Kodu" value={g.postalCode} />}
                  </>
                )}
              </div>
            </Section>
            <Section icon={AlertCircle} title="Acil Durum İrtibatı">
              <div className="grid grid-cols-3 gap-3">
                <InfoRow label="Ad Soyad" value={g.emergencyContact?.name} />
                <InfoRow label="Telefon" value={g.emergencyContact?.phone} />
                <InfoRow label="Yakınlık" value={g.emergencyContact?.relation} />
              </div>
            </Section>
            {g.communicationPref && (
              <Section icon={Bell} title="İletişim Tercihleri">
                <div className="grid grid-cols-3 gap-3">
                  <InfoRow label="Tercih Edilen Kanal" value={g.communicationPref.preferredChannel} />
                  <InfoRow label="Dil" value={g.communicationPref.preferredLanguage} />
                  <InfoRow label="Pazarlama İzni" value={g.communicationPref.marketingConsent ? "Evet" : "Hayır"} />
                  <InfoRow label="Rahatsız Etmeyin" value={g.communicationPref.doNotDisturb ? "Evet" : "Hayır"} />
                </div>
              </Section>
            )}
          </div>
        );

      case "id-card":
        return (
          <div className="space-y-4">
            <Section icon={ShieldCheck} title="Kimlik Belgesi">
              {g.idDocument ? (
                <Card className="border-dashed"><CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></div>
                    <div><p className="text-[13px] font-semibold">{idTypeLabels[g.idDocument.type]}</p><p className="font-mono text-[12px] text-muted-foreground">{g.idDocument.number}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {g.idDocument.issuedBy && <InfoRow label="Veren Kurum" value={g.idDocument.issuedBy} />}
                    {g.idDocument.issueDate && <InfoRow label="Veriliş" value={fmtDate(g.idDocument.issueDate)} />}
                    {g.idDocument.expiryDate && <InfoRow label="Geçerlilik" value={fmtDate(g.idDocument.expiryDate)} />}
                  </div>
                </CardContent></Card>
              ) : <p className="text-[12px] text-muted-foreground italic">Kimlik belgesi kaydı yok</p>}
              {g.additionalDocuments && g.additionalDocuments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Ek Belgeler</p>
                  {g.additionalDocuments.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border p-2 text-[12px]">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{idTypeLabels[doc.type]}</span>
                      <span className="font-mono text-muted-foreground">{doc.number}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section icon={CreditCard} title={`Kayıtlı Kartlar (${g.creditCards?.length || 0})`}>
              {g.creditCards && g.creditCards.length > 0 ? (
                <div className="space-y-2">{g.creditCards.map((card, idx) => {
                  const brand = cardBrandLogos[card.brand] || cardBrandLogos.other;
                  return (<div key={idx} className={cn("flex items-center gap-3 rounded-lg border p-3", card.isDefault && "ring-1 ring-primary/30")}>
                    <div className={cn("flex h-10 w-14 items-center justify-center rounded-md text-[11px] font-bold", brand.color)}>{brand.label}</div>
                    <div className="flex-1"><div className="flex items-center gap-2"><p className="font-mono text-[13px] font-medium tracking-wider">•••• {card.lastFour}</p>{card.isDefault && <Badge className="text-[9px] h-4">Varsayılan</Badge>}</div><p className="text-[11px] text-muted-foreground">{card.cardHolder} · {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}</p></div>
                  </div>);
                })}</div>
              ) : <p className="text-[12px] text-muted-foreground italic">Kayıtlı kart yok</p>}
            </Section>
          </div>
        );

      case "room-pref":
        const rp = g.roomPreferences;
        return (
          <div className="space-y-4">
            <Section icon={BedDouble} title="Oda Tercihleri">
              <div className="grid grid-cols-3 gap-3">
                <InfoRow label="Kat Tercihi" value={floorLabels[rp?.floorPreference || "any"]} />
                <InfoRow label="Yatak Tipi" value={bedLabels[rp?.bedType || "any"]} />
                <InfoRow label="Sigara" value={smokingLabels[rp?.smokingPreference || "any"]} />
                <InfoRow label="Manzara" value={viewLabels[rp?.viewPreference || "any"]} />
                <InfoRow label="Yastık" value={pillowLabels[rp?.pillow || "any"]} />
                <InfoRow label="Oda Sıcaklığı" value={tempLabels[rp?.roomTemperature || "standard"]} />
              </div>
            </Section>
            <Section icon={CheckCircle2} title="Ek Tercihler">
              <div className="flex flex-wrap gap-2">
                {rp?.quietRoom && <Badge variant="secondary" className="text-[10px]">Sessiz Oda</Badge>}
                {rp?.connectingRoom && <Badge variant="secondary" className="text-[10px]">Bağlantılı Oda</Badge>}
                {rp?.accessibilityNeeds && <Badge variant="secondary" className="text-[10px]">Engelli Erişimi</Badge>}
                {rp?.extraBed && <Badge variant="secondary" className="text-[10px]">Ek Yatak</Badge>}
                {rp?.earlyCheckIn && <Badge variant="secondary" className="text-[10px]">Erken Giriş</Badge>}
                {rp?.lateCheckOut && <Badge variant="secondary" className="text-[10px]">Geç Çıkış</Badge>}
                {!rp && <p className="text-[12px] text-muted-foreground italic">Oda tercihi kaydedilmemiş</p>}
              </div>
            </Section>
            {rp?.minibarStocking && rp.minibarStocking.length > 0 && (
              <Section icon={Coffee} title="Minibar İstekleri">
                <div className="flex flex-wrap gap-1.5">{rp.minibarStocking.map((m) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div>
              </Section>
            )}
          </div>
        );

      case "dietary":
        const di = g.dietaryInfo;
        return (
          <div className="space-y-4">
            <Section icon={Utensils} title="Diyet Kısıtlamaları">
              {di?.restrictions && di.restrictions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{di.restrictions.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}</div>
              ) : <p className="text-[12px] text-muted-foreground italic">Diyet kısıtlaması yok</p>}
            </Section>
            <Section icon={AlertCircle} title="Alerjiler">
              {(g.allergies && g.allergies.length > 0) || (di?.allergies && di.allergies.length > 0) ? (
                <div className="flex flex-wrap gap-1.5">
                  {(g.allergies || []).map((a) => <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>)}
                  {(di?.allergies || []).filter((a) => !(g.allergies || []).includes(a)).map((a) => <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>)}
                </div>
              ) : <p className="text-[12px] text-muted-foreground italic">Alerji bilgisi yok</p>}
            </Section>
            {di?.specialRequests && (
              <Section icon={MessageSquare} title="Özel İstekler">
                <div className="rounded-lg border bg-muted/30 p-3"><p className="text-[12px]">{di.specialRequests}</p></div>
              </Section>
            )}
            <Section icon={Heart} title="Genel Tercihler">
              {g.preferences && g.preferences.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{g.preferences.map((p) => <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>)}</div>
              ) : <p className="text-[12px] text-muted-foreground italic">Tercih kaydı yok</p>}
            </Section>
          </div>
        );

      case "stays":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Section icon={BarChart3} title="İstatistikler" inline>
                <div className="flex gap-3 ml-auto">
                  <MiniStat label="Konaklama" value={String(g.totalStays)} />
                  <MiniStat label="Toplam Gece" value={String(g.totalNights || g.totalStays)} />
                  <MiniStat label="Harcama" value={formatCurrency(g.totalSpent)} />
                  <MiniStat label="Ort. Harcama" value={formatCurrency(g.avgSpendPerStay || (g.totalStays > 0 ? g.totalSpent / g.totalStays : 0))} />
                  {g.noShowCount ? <MiniStat label="No-show" value={String(g.noShowCount)} highlight /> : null}
                  {g.cancellationCount ? <MiniStat label="İptal" value={String(g.cancellationCount)} highlight /> : null}
                </div>
              </Section>
            </div>
            <Section icon={CalendarDays} title={`Konaklama Geçmişi (${g.stayHistory?.length || 0})`}>
              {g.stayHistory && g.stayHistory.length > 0 ? (
                <div className="space-y-2">{g.stayHistory.map((stay) => {
                  const sc = stayStatusConfig[stay.status] || stayStatusConfig.completed;
                  return (<div key={stay.id} className={cn("flex items-start justify-between rounded-lg border p-3", stay.status === "in-house" && "ring-1 ring-blue-300")}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><BedDouble className="h-4 w-4" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold">Oda {stay.roomNumber}</span>
                          <Badge variant="secondary" className="text-[9px]">{roomTypeLabels[stay.roomType]}</Badge>
                          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-medium", sc.color)}>{sc.label}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(stay.checkIn)} → {fmtDate(stay.checkOut)} · {stay.nights} gece · {stay.source}</p>
                        {stay.feedback && <div className="mt-1 rounded bg-muted/50 px-2 py-1"><p className="text-[10px] text-muted-foreground italic">&ldquo;{stay.feedback}&rdquo;</p></div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold">{formatCurrency(stay.totalAmount)}</p>
                      {stay.rating && <div className="mt-1">{renderStars(stay.rating)}</div>}
                    </div>
                  </div>);
                })}</div>
              ) : <p className="text-[12px] text-muted-foreground italic">Konaklama geçmişi yok</p>}
            </Section>
          </div>
        );

      case "loyalty":
        const tier = tierLabels[g.loyaltyTier || ""];
        return (
          <div className="space-y-4">
            <Section icon={Award} title="Sadakat Programı">
              <div className="grid grid-cols-3 gap-3">
                <InfoRow label="Üyelik No" value={g.loyaltyNumber || "—"} />
                <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Seviye</p>{tier ? <Badge className={cn("mt-1 text-[10px]", tier.color)}>{tier.label}</Badge> : <p className="mt-0.5 text-[13px]">—</p>}</div>
                <InfoRow label="Puan" value={g.loyaltyPoints != null ? String(g.loyaltyPoints) : "—"} />
              </div>
            </Section>
            {g.specialDates && g.specialDates.length > 0 && (
              <Section icon={Cake} title="Özel Tarihler">
                <div className="space-y-1.5">{g.specialDates.map((sd, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{sd.label}:</span>
                    <span>{fmtDate(sd.date)}</span>
                    {sd.reminder && <Badge variant="outline" className="text-[9px]">Hatırlatıcı</Badge>}
                  </div>
                ))}</div>
              </Section>
            )}
            {g.linkedProfiles && g.linkedProfiles.length > 0 && (
              <Section icon={Users} title="Bağlı Profiller">
                <div className="space-y-1.5">{g.linkedProfiles.map((lp, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{lp.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{relationLabels[lp.relation]}</Badge>
                  </div>
                ))}</div>
              </Section>
            )}
          </div>
        );

      case "notes":
        return (
          <div className="space-y-4">
            <Section icon={MessageSquare} title="Misafir Notları">
              {editing ? (
                <Textarea className="text-[12px] min-h-[80px]" value={(ef.notes as string) || ""} onChange={(e) => setEf("notes", e.target.value)} placeholder="Misafir hakkında notlar..." />
              ) : g.notes ? <div className="rounded-lg border bg-muted/30 p-3"><p className="text-[12px] leading-relaxed whitespace-pre-wrap">{g.notes}</p></div> : <p className="text-[12px] text-muted-foreground italic">Not yok</p>}
            </Section>
            <Section icon={Eye} title="İç Notlar (Sadece Personel)">
              {editing ? (
                <Textarea className="text-[12px] min-h-[60px]" value={(ef.internalNotes as string) || ""} onChange={(e) => setEf("internalNotes", e.target.value)} placeholder="Dahili notlar..." />
              ) : g.internalNotes ? <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"><p className="text-[12px] leading-relaxed whitespace-pre-wrap">{g.internalNotes}</p></div> : <p className="text-[12px] text-muted-foreground italic">İç not yok</p>}
            </Section>
            {g.activityLog && g.activityLog.length > 0 && (
              <Section icon={Activity} title="Aktivite Geçmişi">
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">{g.activityLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-[11px] border-l-2 border-muted pl-3 py-1">
                    <span className="text-muted-foreground whitespace-nowrap">{fmtDate(log.date)}</span>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground">{log.details}</span>
                  </div>
                ))}</div>
              </Section>
            )}
          </div>
        );
    }
  };

  // ─── Main Return ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Misafir Profilleri</h1>
          <p className="text-[13px] text-muted-foreground">{allGuests.length} kayıtlı misafir · Fidelio Detay Seviyesi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openGuestList}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Misafir Listesi
          </Button>
          <Button size="sm" onClick={() => { setShowNewGuest(true); setNewStep(0); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni Misafir
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users className="h-4 w-4" /></div><div><p className="text-xl font-bold">{allGuests.length}</p><p className="text-[10px] text-muted-foreground">Toplam Misafir</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Star className="h-4 w-4" /></div><div><p className="text-xl font-bold">{vipCount}</p><p className="text-[10px] text-muted-foreground">VIP Misafir</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><BedDouble className="h-4 w-4" /></div><div><p className="text-xl font-bold">{inHouseCount}</p><p className="text-[10px] text-muted-foreground">Şu An Konaklıyor</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><BarChart3 className="h-4 w-4" /></div><div><p className="text-xl font-bold">{formatCurrency(avgSpend)}</p><p className="text-[10px] text-muted-foreground">Ort. Harcama</p></div></CardContent></Card>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Ad, e-posta, telefon, kimlik, etiket..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px] h-9 text-[12px]"><Filter className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[11px] px-3 py-1.5">{filteredGuests.length} sonuç</Badge>
      </div>

      {/* Guest Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map((guest) => {
          const completeness = calcCompleteness(guest);
          const cat = categoryLabels[guest.category || "regular"];
          const isInHouse = guest.stayHistory?.some((s) => s.status === "in-house");
          return (
            <Card key={guest.id} className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20" onClick={() => openDetail(guest)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[14px] font-bold text-primary">
                      {getInitials(`${guest.firstName} ${guest.lastName}`)}
                    </div>
                    {isInHouse && <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[13px] font-semibold truncate">{guest.title && titleLabels[guest.title] ? `${titleLabels[guest.title]} ` : ""}{guest.firstName} {guest.lastName}</h3>
                      {guest.vipLevel ? <Badge className="bg-amber-100 text-amber-700 text-[8px] h-4 px-1"><Star className="h-2.5 w-2.5" /></Badge> : null}
                      {guest.category === "blacklist" && <Badge variant="destructive" className="text-[8px] h-4 px-1"><Ban className="h-2.5 w-2.5" /></Badge>}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Phone className="h-3 w-3" />{guest.phone}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{guest.email}</span></p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {cat && <Badge className={cn("text-[8px] h-4", cat.color)}>{cat.label}</Badge>}
                      {guest.loyaltyTier && tierLabels[guest.loyaltyTier] && <Badge className={cn("text-[8px] h-4", tierLabels[guest.loyaltyTier].color)}>{tierLabels[guest.loyaltyTier].label}</Badge>}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <div className="text-center"><p className="text-[13px] font-bold">{guest.totalStays}</p><p className="text-[8px] text-muted-foreground">Konaklama</p></div>
                      <div className="text-center"><p className="text-[13px] font-bold">{formatCurrency(guest.totalSpent)}</p><p className="text-[8px] text-muted-foreground">Harcama</p></div>
                      <div className="flex items-center gap-1"><div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden"><div className={cn("h-full rounded-full", completeness > 70 ? "bg-emerald-500" : completeness > 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${completeness}%` }} /></div><span className="text-[9px] text-muted-foreground">%{completeness}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══ Guest Detail Dialog ═══ */}
      <Dialog open={!!selectedGuest} onOpenChange={(open) => { if (!open) { setSelectedGuest(null); setEditing(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedGuest && (() => {
            const g = selectedGuest;
            const completeness = calcCompleteness(g);
            const cat = categoryLabels[g.category || "regular"];
            const isInHouse = g.stayHistory?.some((s) => s.status === "in-house");
            return (
              <>
                {/* Profile Header */}
                <div className="px-6 pt-5 pb-4 border-b bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{getInitials(`${g.firstName} ${g.lastName}`)}</div>
                      {isInHouse && <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background bg-emerald-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[17px] font-bold">{g.title && titleLabels[g.title] ? `${titleLabels[g.title]} ` : ""}{g.firstName} {g.middleName ? `${g.middleName} ` : ""}{g.lastName}</h2>
                        {g.vipLevel ? <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Star className="mr-1 h-3 w-3" />VIP {g.vipLevel}</Badge> : null}
                        {cat && <Badge className={cn("text-[10px]", cat.color)}>{cat.label}</Badge>}
                        {isInHouse && <Badge className="bg-emerald-500 text-white text-[10px]">Konaklıyor</Badge>}
                        {g.category === "blacklist" && <Badge variant="destructive" className="text-[10px]"><Ban className="mr-1 h-3 w-3" />Kara Liste</Badge>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{g.email}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{g.phone}</span>
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{g.nationality}</span>
                        {g.language && <span className="flex items-center gap-1"><Languages className="h-3 w-3" />{g.language.toUpperCase()}</span>}
                        {g.loyaltyNumber && <span className="flex items-center gap-1"><Award className="h-3 w-3" />{g.loyaltyNumber}</span>}
                      </div>
                      {/* Quick Stats Row */}
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <MiniStat label="Konaklama" value={String(g.totalStays)} />
                        <MiniStat label="Harcama" value={formatCurrency(g.totalSpent)} />
                        <MiniStat label="Kart" value={String(g.creditCards?.length || 0)} />
                        {g.lastStayDate && <MiniStat label="Son Konaklama" value={fmtDate(g.lastStayDate)} />}
                        {/* Completeness */}
                        <div className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 border">
                          <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full", completeness > 70 ? "bg-emerald-500" : completeness > 40 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${completeness}%` }} />
                          </div>
                          <span className="text-[10px] font-medium">%{completeness}</span>
                        </div>
                      </div>
                    </div>
                    {/* Edit / Print buttons */}
                    <div className="flex flex-col gap-1.5">
                      {editing ? (
                        <>
                          <Button size="sm" onClick={saveEdit}><Save className="mr-1 h-3.5 w-3.5" />Kaydet</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}><X className="mr-1 h-3.5 w-3.5" />İptal</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={startEdit}><Edit3 className="mr-1 h-3.5 w-3.5" />Düzenle</Button>
                          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="mr-1 h-3.5 w-3.5" />Yazdır</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 pt-3 pb-0 flex gap-1 overflow-x-auto">
                  {detailTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                        className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-[11px] font-medium transition-all border-b-2",
                          detailTab === tab.key ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}>
                        <Icon className="h-3.5 w-3.5" />{tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">{renderTab()}</div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ New Guest Dialog — Multi-step ═══ */}
      <Dialog open={showNewGuest} onOpenChange={setShowNewGuest}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px] flex items-center gap-2"><User className="h-5 w-5" />Yeni Misafir Kaydı</DialogTitle>
            <DialogDescription className="text-[12px]">Adım {newStep + 1}/3 — {["Kişisel Bilgiler", "İletişim & Adres", "Firma & Notlar"][newStep]}</DialogDescription>
          </DialogHeader>
          {/* Step indicator */}
          <div className="flex gap-1 mb-2">{[0, 1, 2].map((s) => <div key={s} className={cn("h-1 flex-1 rounded-full", s <= newStep ? "bg-primary" : "bg-muted")} />)}</div>

          {newStep === 0 && (
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Ünvan</label>
                  <Select value={nf.title} onValueChange={(v) => setNf((p) => ({ ...p, title: v }))}><SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{Object.entries(titleLabels).filter(([k]) => k).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium">Ad *</label>
                  <Input className="mt-1 h-9" placeholder="Ad" value={nf.firstName} onChange={(e) => setNf((p) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium">İkinci Ad</label>
                  <Input className="mt-1 h-9" placeholder="İkinci ad" value={nf.middleName} onChange={(e) => setNf((p) => ({ ...p, middleName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium">Soyad *</label>
                  <Input className="mt-1 h-9" placeholder="Soyad" value={nf.lastName} onChange={(e) => setNf((p) => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Cinsiyet</label>
                  <Select value={nf.gender} onValueChange={(v) => setNf((p) => ({ ...p, gender: v }))}><SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent>{Object.entries(genderLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium">Doğum Tarihi</label>
                  <Input type="date" className="mt-1 h-9" value={nf.birthDate} onChange={(e) => setNf((p) => ({ ...p, birthDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium">Doğum Yeri</label>
                  <Input className="mt-1 h-9" placeholder="Şehir" value={nf.birthPlace} onChange={(e) => setNf((p) => ({ ...p, birthPlace: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Kimlik No</label>
                  <Input className="mt-1 h-9" placeholder="T.C. / Pasaport" value={nf.idNumber} onChange={(e) => setNf((p) => ({ ...p, idNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium">Uyruk</label>
                  <Input className="mt-1 h-9" placeholder="TR" value={nf.nationality} onChange={(e) => setNf((p) => ({ ...p, nationality: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium">Dil</label>
                  <Input className="mt-1 h-9" placeholder="tr" value={nf.language} onChange={(e) => setNf((p) => ({ ...p, language: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium">Kategori</label>
                <Select value={nf.category} onValueChange={(v) => setNf((p) => ({ ...p, category: v }))}><SelectTrigger className="mt-1 h-9 text-[12px]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          )}

          {newStep === 1 && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Telefon</label>
                  <PhoneInput className="mt-1" value={nf.phone} onChange={(v) => setNf((p) => ({ ...p, phone: v }))} countryCode={gPhoneCountry} onCountryChange={setGPhoneCountry} />
                  {nf.phone && !gPhoneOk && <p className="mt-1 text-[10px] text-destructive">Numara eksik</p>}
                </div>
                <div>
                  <label className="text-[11px] font-medium">İkinci Telefon</label>
                  <Input className="mt-1 h-10" placeholder="İkinci numara" value={nf.secondaryPhone} onChange={(e) => setNf((p) => ({ ...p, secondaryPhone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium">E-posta</label>
                  <Input className={cn("mt-1 h-9", gEmailTouched && nf.email && !gEmailOk ? "border-destructive" : gEmailTouched && nf.email && gEmailOk ? "border-emerald-500" : "")} placeholder="ornek@email.com" value={nf.email} onChange={(e) => setNf((p) => ({ ...p, email: e.target.value }))} onBlur={() => setGEmailTouched(true)} />
                  {gEmailTouched && nf.email && !gEmailOk && <p className="mt-1 text-[10px] text-destructive">Geçersiz e-posta</p>}
                </div>
                <div>
                  <label className="text-[11px] font-medium">İkinci E-posta</label>
                  <Input className="mt-1 h-9" placeholder="İkinci e-posta" value={nf.secondaryEmail} onChange={(e) => setNf((p) => ({ ...p, secondaryEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium">Adres</label>
                <Input className="mt-1 h-9" placeholder="Sokak, mahalle..." value={nf.address} onChange={(e) => setNf((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11px] font-medium">Şehir</label><Input className="mt-1 h-9" placeholder="İstanbul" value={nf.city} onChange={(e) => setNf((p) => ({ ...p, city: e.target.value }))} /></div>
                <div><label className="text-[11px] font-medium">Ülke</label><Input className="mt-1 h-9" placeholder="Türkiye" value={nf.country} onChange={(e) => setNf((p) => ({ ...p, country: e.target.value }))} /></div>
                <div><label className="text-[11px] font-medium">Posta Kodu</label><Input className="mt-1 h-9" placeholder="34000" value={nf.postalCode} onChange={(e) => setNf((p) => ({ ...p, postalCode: e.target.value }))} /></div>
              </div>
            </div>
          )}

          {newStep === 2 && (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11px] font-medium">Firma Adı</label><Input className="mt-1 h-9" placeholder="Firma" value={nf.companyName} onChange={(e) => setNf((p) => ({ ...p, companyName: e.target.value }))} /></div>
                <div><label className="text-[11px] font-medium">Vergi No</label><Input className="mt-1 h-9" placeholder="Vergi no" value={nf.taxNumber} onChange={(e) => setNf((p) => ({ ...p, taxNumber: e.target.value }))} /></div>
                <div><label className="text-[11px] font-medium">Firma İrtibat</label><Input className="mt-1 h-9" placeholder="İrtibat kişisi" value={nf.companyContact} onChange={(e) => setNf((p) => ({ ...p, companyContact: e.target.value }))} /></div>
              </div>
              <div>
                <label className="text-[11px] font-medium">Notlar</label>
                <Textarea className="mt-1 text-[12px] min-h-[80px]" placeholder="Misafir hakkında notlar..." value={nf.notes} onChange={(e) => setNf((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div>
              {newStep > 0 && <Button variant="outline" size="sm" onClick={() => setNewStep((s) => s - 1)}>Geri</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewGuest(false)}>İptal</Button>
              {newStep < 2 ? (
                <Button size="sm" onClick={() => setNewStep((s) => s + 1)} disabled={newStep === 0 && (!nf.firstName || !nf.lastName)}>İleri</Button>
              ) : (
                <Button size="sm" onClick={handleCreateGuest} disabled={!nf.firstName || !nf.lastName || (!!nf.phone && !gPhoneOk) || (!!nf.email && !gEmailOk)}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Misafir Oluştur
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Guest List Report Dialog ═══ */}
      <Dialog open={showGuestList} onOpenChange={setShowGuestList}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-[15px] flex items-center gap-2"><FileText className="h-5 w-5" />Misafir Listesi Raporu</DialogTitle>
            <DialogDescription className="text-[12px]">Konaklayan, giriş/çıkış yapacak misafirleri listeleyin ve yazdırın.</DialogDescription>
          </DialogHeader>

          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b bg-muted/30">
            <Select value={guestListFilter} onValueChange={(v) => setGuestListFilter(v as typeof guestListFilter)}>
              <SelectTrigger className="w-[200px] h-8 text-[12px]"><Filter className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in-house">Konaklayan Misafirler</SelectItem>
                <SelectItem value="arriving">Bugün Giriş Yapacaklar</SelectItem>
                <SelectItem value="departing">Bugün Çıkış Yapacaklar</SelectItem>
                <SelectItem value="all">Tüm Aktif Rezervasyonlar</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[11px] px-3 py-1">{filteredGuestList.length} kayıt</Badge>
            <div className="ml-auto">
              <Button size="sm" onClick={printGuestList} disabled={filteredGuestList.length === 0}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />Yazdır
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-6 py-3">
            {guestListLoading ? (
              <div className="flex items-center justify-center py-12"><p className="text-[13px] text-muted-foreground">Yükleniyor...</p></div>
            ) : filteredGuestList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-[13px] text-muted-foreground">Bu filtreyle eşleşen kayıt bulunamadı.</p>
              </div>
            ) : (
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-foreground/80">
                    <th className="text-left py-2 px-2 font-bold">Oda</th>
                    <th className="text-left py-2 px-2 font-bold">Ajenta</th>
                    <th className="text-center py-2 px-2 font-bold">Oda Sayısı</th>
                    <th className="text-center py-2 px-2 font-bold">Kahvaltı</th>
                    <th className="text-center py-2 px-2 font-bold">Kişi Sayısı</th>
                    <th className="text-left py-2 px-2 font-bold">İsim</th>
                    <th className="text-left py-2 px-2 font-bold">Giriş</th>
                    <th className="text-left py-2 px-2 font-bold">Çıkış</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuestList.map((r, idx) => (
                    <tr key={r.id} className={cn("border-b", idx % 2 === 0 ? "bg-muted/20" : "")}>
                      <td className="py-1.5 px-2 font-semibold">{r.room?.number || "—"}</td>
                      <td className="py-1.5 px-2">{r.source || "Direkt"}</td>
                      <td className="py-1.5 px-2 text-center">1</td>
                      <td className="py-1.5 px-2 text-center"><Badge variant="secondary" className="text-[10px] px-1.5 py-0">{(r.mealPlan || "BB").toUpperCase()}</Badge></td>
                      <td className="py-1.5 px-2 text-center font-medium">{r.adults + (r.children || 0)}</td>
                      <td className="py-1.5 px-2 font-medium">{r.guest.firstName} {r.guest.lastName}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{fmtDate(r.checkIn)}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{fmtDate(r.checkOut)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground/80">
                    <td colSpan={4} className="py-2 px-2 font-bold text-[11px]">TOPLAM</td>
                    <td className="py-2 px-2 text-center font-bold">{filteredGuestList.reduce((s, r) => s + r.adults + (r.children || 0), 0)}</td>
                    <td colSpan={3} className="py-2 px-2 text-[11px] text-muted-foreground">{filteredGuestList.length} rezervasyon</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reusable sub-components ───────────────────────────────────────────
function InfoRow({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2")}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-[13px]">{value || "—"}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label><div className="mt-0.5">{children}</div></div>;
}

function Section({ icon: Icon, title, children, inline }: { icon: React.ElementType; title: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <div className={cn(inline && "flex items-center gap-3")}>
      <h4 className={cn("flex items-center gap-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider", !inline && "mb-3")}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      {children}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-background px-2.5 py-1.5 text-center border">
      <p className={cn("text-[13px] font-bold", highlight && "text-destructive")}>{value}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}
