"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { getHotelSettings, saveHotelSettings, invalidateSettingsCache, type HotelSettings } from "@/lib/hotel-settings";
import { downloadBackup, readBackupFile, restoreBackup, getBackupStats, clearAllData } from "@/lib/backup-service";
import {
  Hotel,
  User,
  Shield,
  Bell,
  Globe,
  Palette,
  Database,
  Key,
  Check,
  Plus,
  Trash2,
  Sun,
  Moon,
  Monitor,
  FileText,
  ShieldCheck,
  Download,
  Upload,
  Save,
} from "lucide-react";

type SectionKey = "hotel" | "invoice" | "kbs" | "einvoice" | "users" | "roles" | "notifications" | "locale" | "theme" | "database" | "api";

const navItems: { key: SectionKey; title: string; icon: typeof Hotel }[] = [
  { key: "hotel", title: "Otel Bilgileri", icon: Hotel },
  { key: "invoice", title: "Fatura & Fiş", icon: FileText },
  { key: "kbs", title: "KBS Entegrasyonu", icon: ShieldCheck },
  { key: "einvoice", title: "e-Fatura / e-Arşiv", icon: FileText },
  { key: "users", title: "Kullanıcılar", icon: User },
  { key: "roles", title: "Roller & İzinler", icon: Shield },
  { key: "notifications", title: "Bildirimler", icon: Bell },
  { key: "locale", title: "Dil & Bölge", icon: Globe },
  { key: "theme", title: "Tema", icon: Palette },
  { key: "database", title: "Veritabanı", icon: Database },
  { key: "api", title: "API Anahtarları", icon: Key },
];

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const defaultUsers: AppUser[] = [
  { id: 1, name: "Ahmet Yılmaz", email: "ahmet@creativehotel.com", role: "admin", status: "active" },
  { id: 2, name: "Zeynep Arslan", email: "zeynep@creativehotel.com", role: "reception", status: "active" },
  { id: 3, name: "Murat Çelik", email: "murat@creativehotel.com", role: "housekeeping", status: "active" },
  { id: 4, name: "Elif Şahin", email: "elif@creativehotel.com", role: "accounting", status: "inactive" },
];

const USERS_LS_KEY = "creative_users";

const defaultRoles = [
  { id: 1, name: "Admin", description: "Tam yetki", users: 1, permissions: ["all"] },
  { id: 2, name: "Resepsiyon", description: "Check-in/out, rezervasyon yönetimi", users: 1, permissions: ["reservations", "front-desk", "guests"] },
  { id: 3, name: "Housekeeping", description: "Oda temizlik yönetimi", users: 1, permissions: ["housekeeping", "rooms"] },
  { id: 4, name: "Muhasebe", description: "Folio, fatura ve raporlar", users: 1, permissions: ["billing", "reports"] },
];

const ROLES_LS_KEY = "creative_roles";

const allPermissions = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reservations", label: "Rezervasyonlar" },
  { key: "front-desk", label: "Resepsiyon" },
  { key: "rooms", label: "Odalar" },
  { key: "guests", label: "Misafirler" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "billing", label: "Kasa / Folio" },
  { key: "reports", label: "Raporlar" },
  { key: "night-audit", label: "Night Audit" },
  { key: "settings", label: "Ayarlar" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("hotel");
  const [selectedRole, setSelectedRole] = useState(0);
  const [themeMode, setThemeMode] = useState("light");
  const [accentColor, setAccentColor] = useState("Mavi");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ─── Hotel settings state ─────────────────────────────────────
  const [hs, setHs] = useState<HotelSettings | null>(null);
  useEffect(() => {
    setHs(getHotelSettings());
  }, []);
  const updateHs = (field: keyof HotelSettings, value: string | number | boolean) => {
    if (!hs) return;
    setHs({ ...hs, [field]: value });
  };
  const handleSaveHotel = () => {
    if (!hs) return;
    saveHotelSettings(hs);
    invalidateSettingsCache();
    showSaved("Otel bilgileri kaydedildi");
  };

  // ─── Role management state ─────────────────────────────────────
  const [roles, setRoles] = useState(defaultRoles);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROLES_LS_KEY);
      if (raw) setRoles(JSON.parse(raw));
    } catch {}
  }, []);

  const saveRoles = (list: typeof defaultRoles) => {
    setRoles(list);
    localStorage.setItem(ROLES_LS_KEY, JSON.stringify(list));
  };

  const openAddRole = () => {
    setRoleFormName(""); setRoleFormDesc(""); setRoleFormPerms([]);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleFormName.trim()) return;
    const newId = roles.length > 0 ? Math.max(...roles.map((r) => r.id)) + 1 : 1;
    const updated = [...roles, { id: newId, name: roleFormName, description: roleFormDesc, users: 0, permissions: roleFormPerms }];
    saveRoles(updated);
    setRoleDialogOpen(false);
    showSaved("Yeni rol eklendi");
  };

  const toggleRolePerm = (key: string) => {
    setRoleFormPerms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  };

  // ─── User management state ─────────────────────────────────────
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("reception");
  const [formStatus, setFormStatus] = useState("active");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USERS_LS_KEY);
      if (raw) { setUsers(JSON.parse(raw)); }
      else { setUsers(defaultUsers); localStorage.setItem(USERS_LS_KEY, JSON.stringify(defaultUsers)); }
    } catch { setUsers(defaultUsers); }
  }, []);

  const saveUsers = (list: AppUser[]) => {
    setUsers(list);
    localStorage.setItem(USERS_LS_KEY, JSON.stringify(list));
  };

  const openAddUser = () => {
    setEditingUser(null);
    setFormName(""); setFormEmail(""); setFormRole("reception"); setFormStatus("active");
    setUserDialogOpen(true);
  };

  const openEditUser = (u: AppUser) => {
    setEditingUser(u);
    setFormName(u.name); setFormEmail(u.email); setFormRole(u.role); setFormStatus(u.status);
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!formName.trim() || !formEmail.trim()) return;
    if (editingUser) {
      saveUsers(users.map((u) => u.id === editingUser.id ? { ...u, name: formName, email: formEmail, role: formRole, status: formStatus } : u));
    } else {
      const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      saveUsers([...users, { id: newId, name: formName, email: formEmail, role: formRole, status: formStatus }]);
    }
    setUserDialogOpen(false);
    showSaved(editingUser ? "Kullanıcı güncellendi" : "Kullanıcı eklendi");
  };

  const handleDeleteUser = (id: number) => {
    saveUsers(users.filter((u) => u.id !== id));
    showSaved("Kullanıcı silindi");
  };
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    "Yeni rezervasyon geldiğinde": true,
    "Check-in yapıldığında": true,
    "Check-out yapıldığında": false,
    "Ödeme alındığında": true,
    "Night Audit tamamlandığında": true,
    "Housekeeping görevi atandığında": false,
    "VIP misafir geldiğinde": true,
    "Açık bakiye uyarısı": true,
  });

  const showSaved = (msg = "Kaydedildi!") => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const toggleNotification = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderContent = () => {
    switch (activeSection) {
      case "hotel":
        if (!hs) return null;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Hotel className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">Otel Bilgileri</CardTitle>
                  <CardDescription className="text-[12px]">Bu bilgiler fiş, fatura ve raporlarda kullanılır</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { label: "Otel Adı", field: "hotelName" as const },
                { label: "Adres", field: "hotelAddress" as const },
                { label: "Şehir / Ülke", field: "hotelCity" as const },
                { label: "Telefon", field: "hotelPhone" as const },
                { label: "E-posta", field: "hotelEmail" as const },
                { label: "Web Sitesi", field: "hotelWebsite" as const },
              ]).map((item) => (
                <div key={item.field} className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[13px] font-medium">{item.label}</label>
                  <Input value={String(hs[item.field])} onChange={(e) => updateHs(item.field, e.target.value)} className="col-span-2" />
                </div>
              ))}
              <Separator />
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Vergi Bilgileri</p>
              {([
                { label: "Vergi Kimlik No (VKN)", field: "taxNumber" as const },
                { label: "Vergi Dairesi", field: "taxOffice" as const },
                { label: "Ticaret Sicil No", field: "tradeRegNumber" as const },
                { label: "MERSİS No", field: "mersisNo" as const },
              ]).map((item) => (
                <div key={item.field} className="grid grid-cols-3 items-center gap-4">
                  <label className="text-[13px] font-medium">{item.label}</label>
                  <Input value={String(hs[item.field])} onChange={(e) => updateHs(item.field, e.target.value)} className="col-span-2" />
                </div>
              ))}
              <Separator />
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Operasyonel Ayarlar</p>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Check-in Saati</label>
                <Input type="time" value={hs.checkInTime} onChange={(e) => updateHs("checkInTime", e.target.value)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Check-out Saati</label>
                <Input type="time" value={hs.checkOutTime} onChange={(e) => updateHs("checkOutTime", e.target.value)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Yıldız</label>
                <Select value={String(hs.hotelStarRating)} onValueChange={(v) => updateHs("hotelStarRating", parseInt(v))}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n} Yıldız</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Varsayılan Pansiyon</label>
                <Select value={hs.defaultMealPlan} onValueChange={(v) => updateHs("defaultMealPlan", v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RO">Sadece Oda</SelectItem>
                    <SelectItem value="BB">Kahvaltı Dahil</SelectItem>
                    <SelectItem value="HB">Yarım Pansiyon</SelectItem>
                    <SelectItem value="FB">Tam Pansiyon</SelectItem>
                    <SelectItem value="AI">Her Şey Dahil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveHotel}><Save className="mr-1.5 h-3.5 w-3.5" />Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "invoice":
        if (!hs) return null;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">Fatura & Fiş Ayarları</CardTitle>
                  <CardDescription className="text-[12px]">Sıralı numaralama, KDV oranı ve önek ayarları</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Fatura Öneki</label>
                <Input value={hs.invoicePrefix} onChange={(e) => updateHs("invoicePrefix", e.target.value.toUpperCase())} className="col-span-2" placeholder="FTR" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Son Fatura No</label>
                <div className="col-span-2 flex items-center gap-2">
                  <Input type="number" value={hs.lastInvoiceNumber} onChange={(e) => updateHs("lastInvoiceNumber", parseInt(e.target.value) || 0)} />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Sonraki: {hs.invoicePrefix}-{new Date().getFullYear()}-{(hs.lastInvoiceNumber + 1).toString().padStart(6, "0")}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Fiş Öneki</label>
                <Input value={hs.receiptPrefix} onChange={(e) => updateHs("receiptPrefix", e.target.value.toUpperCase())} className="col-span-2" placeholder="FIS" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Son Fiş No</label>
                <div className="col-span-2 flex items-center gap-2">
                  <Input type="number" value={hs.lastReceiptNumber} onChange={(e) => updateHs("lastReceiptNumber", parseInt(e.target.value) || 0)} />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Sonraki: {hs.receiptPrefix}-{new Date().getFullYear()}-{(hs.lastReceiptNumber + 1).toString().padStart(6, "0")}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">KDV Oranı (%)</label>
                <Input type="number" value={Math.round(hs.kdvRate * 100)} onChange={(e) => updateHs("kdvRate", (parseInt(e.target.value) || 0) / 100)} className="col-span-2" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Para Birimi</label>
                <Select value={hs.currency} onValueChange={(v) => { updateHs("currency", v); updateHs("currencySymbol", v === "TRY" ? "₺" : v === "USD" ? "$" : "€"); }}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ Türk Lirası (TRY)</SelectItem>
                    <SelectItem value="USD">$ ABD Doları (USD)</SelectItem>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveHotel}><Save className="mr-1.5 h-3.5 w-3.5" />Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "kbs":
        if (!hs) return null;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">KBS - Kimlik Bildirme Sistemi</CardTitle>
                  <CardDescription className="text-[12px]">Emniyet Genel Müdürlüğü misafir bildirim entegrasyonu</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                <div>
                  <span className="text-[13px] font-medium">KBS Entegrasyonu</span>
                  <p className="text-[11px] text-muted-foreground">Check-in yapıldığında misafir bilgisi otomatik bildirilir</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateHs("kbsEnabled", !hs.kbsEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                    hs.kbsEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    hs.kbsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              {hs.kbsEnabled && (
                <>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">Tesis Kodu</label>
                    <Input value={hs.kbsFacilityCode} onChange={(e) => updateHs("kbsFacilityCode", e.target.value)} className="col-span-2" placeholder="Emniyet tesis kodu" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">Kullanıcı Adı</label>
                    <Input value={hs.kbsUsername} onChange={(e) => updateHs("kbsUsername", e.target.value)} className="col-span-2" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">Şifre</label>
                    <Input type="password" value={hs.kbsPassword} onChange={(e) => updateHs("kbsPassword", e.target.value)} className="col-span-2" />
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-[11px] text-amber-800">
                      <strong>Not:</strong> KBS bağlantı bilgilerinizi il Emniyet Müdürlüğü&apos;nden temin ediniz. 
                      Tesis kodu ve şifre doğru girildiğinde check-in sırasında misafir bilgileri otomatik olarak bildirilecektir.
                    </p>
                  </div>
                </>
              )}
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveHotel}><Save className="mr-1.5 h-3.5 w-3.5" />Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "einvoice":
        if (!hs) return null;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">e-Fatura / e-Arşiv</CardTitle>
                  <CardDescription className="text-[12px]">Gelir İdaresi Başkanlığı elektronik fatura entegrasyonu</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                <div>
                  <span className="text-[13px] font-medium">e-Fatura Entegrasyonu</span>
                  <p className="text-[11px] text-muted-foreground">Check-out faturaları GİB&apos;e otomatik iletilir</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateHs("eInvoiceEnabled", !hs.eInvoiceEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                    hs.eInvoiceEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    hs.eInvoiceEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              {hs.eInvoiceEnabled && (
                <>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">Entegratör</label>
                    <Select value={hs.eInvoiceProvider} onValueChange={(v) => updateHs("eInvoiceProvider", v)}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gib">GİB Portal (Doğrudan)</SelectItem>
                        <SelectItem value="logo">Logo Yazılım</SelectItem>
                        <SelectItem value="foriba">Foriba / Sovos</SelectItem>
                        <SelectItem value="edm">EDM Bilişim</SelectItem>
                        <SelectItem value="uyumsoft">Uyumsoft</SelectItem>
                        <SelectItem value="izibiz">İzibiz</SelectItem>
                        <SelectItem value="parabus">Parabüs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">API URL</label>
                    <Input value={hs.eInvoiceApiUrl} onChange={(e) => updateHs("eInvoiceApiUrl", e.target.value)} className="col-span-2" placeholder="https://api.entegrator.com/v1" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-[13px] font-medium">API Anahtarı</label>
                    <Input type="password" value={hs.eInvoiceApiKey} onChange={(e) => updateHs("eInvoiceApiKey", e.target.value)} className="col-span-2" placeholder="e-Fatura API key" />
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-[11px] text-blue-800">
                      <strong>Not:</strong> e-Fatura mükellefiyeti GIB&apos;den alınmalıdır. Entegratör firma ile anlaşma yapıldıktan sonra 
                      API bilgileri buraya girilir. Check-out sırasında faturalar otomatik olarak e-Fatura / e-Arşiv olarak kesilir.
                    </p>
                  </div>
                </>
              )}
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveHotel}><Save className="mr-1.5 h-3.5 w-3.5" />Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "users":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">Kullanıcılar</h3>
                <p className="text-[12px] text-muted-foreground">{users.length} kayıtlı kullanıcı</p>
              </div>
              <Button size="sm" onClick={openAddUser}><Plus className="mr-1.5 h-3.5 w-3.5" />Yeni Kullanıcı</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ad Soyad</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-posta</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Durum</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-[13px] font-medium">{u.name}</td>
                        <td className="px-3 py-2.5 text-[13px] text-muted-foreground">{u.email}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[10px] capitalize">{u.role === "admin" ? "Admin" : u.role === "reception" ? "Resepsiyon" : u.role === "housekeeping" ? "Housekeeping" : u.role === "bartender" ? "Barmen" : "Muhasebe"}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={u.status === "active" ? "success" : "secondary"} className="text-[10px]">
                            {u.status === "active" ? "Aktif" : "Pasif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center space-x-1">
                          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => openEditUser(u)}>Düzenle</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-destructive hover:text-destructive" onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-[13px] text-muted-foreground">Henüz kullanıcı yok</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );

      case "roles":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">Roller & İzinler</h3>
                <p className="text-[12px] text-muted-foreground">Kullanıcı rollerini ve erişim izinlerini yönetin</p>
              </div>
              <Button size="sm" onClick={openAddRole}><Plus className="mr-1.5 h-3.5 w-3.5" />Yeni Rol</Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Role List */}
              <div className="space-y-2">
                {roles.map((role, i) => (
                  <Card
                    key={role.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedRole === i ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"
                    )}
                    onClick={() => setSelectedRole(i)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold">{role.name}</p>
                          <p className="text-[11px] text-muted-foreground">{role.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{role.users} kullanıcı</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Permission Matrix */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">
                    {roles[selectedRole]?.name ?? ""} — İzinler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allPermissions.map((perm) => {
                    const role = roles[selectedRole];
                    const hasAll = role?.permissions.includes("all") ?? false;
                    const hasPerm = hasAll || (role?.permissions.includes(perm.key) ?? false);
                    return (
                      <div key={perm.key} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                        <span className="text-[12px] font-medium">{perm.label}</span>
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded",
                          hasPerm ? "bg-emerald-500 text-white" : "bg-muted"
                        )}>
                          {hasPerm && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">Bildirimler</CardTitle>
                  <CardDescription className="text-[12px]">Hangi durumlarda bildirim alacağınızı ayarlayın</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(notifications).map(([label, enabled]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="text-[13px]">{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleNotification(label)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                      enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      enabled ? "translate-x-[22px]" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => showSaved()}>Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "locale":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">Dil & Bölge</CardTitle>
                  <CardDescription className="text-[12px]">Dil, saat dilimi ve para birimi ayarları</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Dil</label>
                <Select defaultValue="tr">
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Saat Dilimi</label>
                <Select defaultValue="europe-istanbul">
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="europe-istanbul">Europe/Istanbul (UTC+3)</SelectItem>
                    <SelectItem value="europe-london">Europe/London (UTC+0)</SelectItem>
                    <SelectItem value="europe-berlin">Europe/Berlin (UTC+1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Para Birimi</label>
                <Select defaultValue="try">
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="try">₺ Türk Lirası (TRY)</SelectItem>
                    <SelectItem value="usd">$ ABD Doları (USD)</SelectItem>
                    <SelectItem value="eur">€ Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Tarih Formatı</label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">GG.AA.YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">AA/GG/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-AA-GG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => showSaved()}>Kaydet</Button>
              </div>
            </CardContent>
          </Card>
        );

      case "theme":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">Tema</CardTitle>
                  <CardDescription className="text-[12px]">Görünüm ve renk ayarları</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[13px] font-medium">Görünüm Modu</label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { key: "light", label: "Açık", icon: Sun },
                    { key: "dark", label: "Koyu", icon: Moon },
                    { key: "system", label: "Sistem", icon: Monitor },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isActive = themeMode === mode.key;
                    return (
                      <button
                        type="button"
                        key={mode.key}
                        onClick={() => setThemeMode(mode.key)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
                          isActive ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        <span className={cn("text-[12px] font-medium", isActive && "text-primary")}>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-[13px] font-medium">Vurgu Rengi</label>
                <div className="mt-2 flex gap-3">
                  {[
                    { color: "bg-blue-500", ring: "ring-blue-500", label: "Mavi" },
                    { color: "bg-amber-500", ring: "ring-amber-500", label: "Amber" },
                    { color: "bg-emerald-500", ring: "ring-emerald-500", label: "Yeşil" },
                    { color: "bg-purple-500", ring: "ring-purple-500", label: "Mor" },
                    { color: "bg-rose-500", ring: "ring-rose-500", label: "Kırmızı" },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.label}
                      onClick={() => setAccentColor(c.label)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                        c.color,
                        accentColor === c.label && `ring-2 ring-offset-2 ${c.ring}`
                      )}
                      title={c.label}
                    >
                      {accentColor === c.label && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-[13px] font-medium">Sidebar Pozisyonu</label>
                <Select defaultValue="left">
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Sol</SelectItem>
                    <SelectItem value="right">Sağ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case "database": {
        const bStats = typeof window !== "undefined" ? getBackupStats() : { keyCount: 0, estimatedSize: "0 KB" };
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-[15px]">Veritabanı & Yedekleme</CardTitle>
                    <CardDescription className="text-[12px]">Veri yedekleme, geri yükleme ve sıfırlama</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="text-[13px]">Veri Depolama</span>
                  <Badge variant="secondary" className="text-[10px]">localStorage</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="text-[13px]">Toplam Anahtar</span>
                  <span className="text-[13px] font-medium">{bStats.keyCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="text-[13px]">Tahmini Boyut</span>
                  <span className="text-[13px] font-medium">{bStats.estimatedSize}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <span className="text-[13px]">Versiyon</span>
                  <Badge variant="secondary" className="text-[10px]">v1.0.0</Badge>
                </div>
                <Separator />
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Yedekleme</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { downloadBackup(); showSaved("✅ Yedek dosyası indirildi"); }}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />Yedek İndir (.json)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const backup = await readBackupFile(file);
                        const result = restoreBackup(backup);
                        if (result.success) {
                          showSaved(`✅ ${result.keysRestored} kayıt geri yüklendi — sayfa yenileniyor...`);
                          setTimeout(() => window.location.reload(), 1500);
                        } else {
                          showSaved(`❌ Hata: ${result.error}`);
                        }
                      } catch (err: any) {
                        showSaved(`❌ ${err?.message || "Dosya okunamadı"}`);
                      }
                    };
                    input.click();
                  }}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />Yedek Yükle
                  </Button>
                </div>
                <Separator />
                <p className="text-[12px] font-semibold text-destructive uppercase tracking-wider">Tehlikeli Bölge</p>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm("TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Devam etmek istiyor musunuz?")) {
                    clearAllData();
                    showSaved("Tüm veriler silindi — sayfa yenileniyor...");
                    setTimeout(() => window.location.reload(), 1500);
                  }
                }}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Tüm Verileri Sıfırla
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "api":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">API Anahtarları</h3>
                <p className="text-[12px] text-muted-foreground">Dış sistem entegrasyonları için API anahtarları</p>
              </div>
              <Button size="sm" onClick={() => showSaved("Yeni API anahtarı oluşturuldu (simülasyon)")}><Plus className="mr-1.5 h-3.5 w-3.5" />Yeni Anahtar</Button>
            </div>
            {[
              { name: "Booking.com Entegrasyonu", key: "bk_live_****7a3f", created: "01.01.2026", status: "active" },
              { name: "Channel Manager", key: "cm_live_****9b2d", created: "15.01.2026", status: "active" },
              { name: "POS Sistemi", key: "pos_live_****4e1c", created: "20.01.2026", status: "inactive" },
            ].map((apiKey) => (
              <Card key={apiKey.name}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-[13px] font-semibold">{apiKey.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{apiKey.key}</p>
                    <p className="text-[11px] text-muted-foreground">Oluşturulma: {apiKey.created}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.status === "active" ? "success" : "secondary"} className="text-[10px]">
                      {apiKey.status === "active" ? "Aktif" : "Pasif"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => showSaved("API anahtarı silindi (simülasyon)")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-[13px] text-muted-foreground">Creative sistem yapılandırması</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Left: Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                  activeSection === item.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </div>

        {/* Right: Content */}
        <div className="relative">
          {saveMsg && (
            <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 rounded-lg border bg-card px-4 py-2.5 text-[13px] font-medium shadow-lg">
              {saveMsg}
            </div>
          )}
          {renderContent()}
        </div>
      </div>
      {/* User Add/Edit Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Ad Soyad</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Örn: Ali Veli" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">E-posta</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="ali@creativehotel.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Rol</label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="reception">Resepsiyon</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="bartender">Barmen</SelectItem>
                  <SelectItem value="accounting">Muhasebe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Durum</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setUserDialogOpen(false)}>İptal</Button>
              <Button size="sm" onClick={handleSaveUser} disabled={!formName.trim() || !formEmail.trim()}>
                {editingUser ? "Güncelle" : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Role Add Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Yeni Rol Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Rol Adı</label>
              <Input value={roleFormName} onChange={(e) => setRoleFormName(e.target.value)} placeholder="Örn: Kat Hizmetleri" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Açıklama</label>
              <Input value={roleFormDesc} onChange={(e) => setRoleFormDesc(e.target.value)} placeholder="Kısa açıklama" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">İzinler</label>
              <div className="grid grid-cols-2 gap-1.5">
                {allPermissions.map((perm) => (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => toggleRolePerm(perm.key)}
                    className={cn(
                      "flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] font-medium transition-all",
                      roleFormPerms.includes(perm.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <div className={cn("flex h-4 w-4 items-center justify-center rounded-sm", roleFormPerms.includes(perm.key) ? "bg-primary text-white" : "bg-muted")}>
                      {roleFormPerms.includes(perm.key) && <Check className="h-2.5 w-2.5" />}
                    </div>
                    {perm.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(false)}>İptal</Button>
              <Button size="sm" onClick={handleSaveRole} disabled={!roleFormName.trim()}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Ekle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
