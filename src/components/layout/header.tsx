"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogIn, LogOut, AlertCircle, CreditCard, CheckCircle2, Sparkles, Wrench, Printer, HelpCircle, RotateCcw, User, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotifications, markNotificationRead, markAllNotificationsRead, type PmsNotification } from "@/lib/notification-service";
import { getSession, logout, roleLabels, type AuthSession } from "@/lib/auth-service";

const notifIcons: Record<string, { icon: typeof Bell; color: string }> = {
  checkin: { icon: LogIn, color: "text-blue-700" },
  checkout: { icon: LogOut, color: "text-orange-700" },
  payment: { icon: CreditCard, color: "text-green-700" },
  housekeeping: { icon: Sparkles, color: "text-purple-700" },
  maintenance: { icon: Wrench, color: "text-blue-700" },
  alert: { icon: AlertCircle, color: "text-red-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
}

export function Header() {
  const router = useRouter();
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<PmsNotification[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateStr(new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
      }).format(now));
      setTimeStr(new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).format(now));
    };
    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = useCallback(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    const iv = setInterval(loadNotifications, 15_000);
    return () => clearInterval(iv);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    };
    if (notifOpen || helpOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen, helpOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <header className="flex h-[38px] items-center justify-between border-b bg-card px-0"
    >
      {/* Left toolbar buttons */}
      <div className="flex items-center h-full">
        <button type="button" className="fidelio-toolbar-btn h-full" title="Ara (Ctrl+F)"
          onClick={() => {
            const searchInput = document.querySelector<HTMLInputElement>('main input[placeholder*="ara" i], main input[placeholder*="search" i], main input[placeholder*="Ara" i]');
            if (searchInput) { searchInput.focus(); searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          }}
        >
          <Search className="h-4 w-4 text-primary" />
          <span className="text-[10px] text-foreground/70">Ara</span>
        </button>
        <div className="h-6 w-px bg-border mx-0.5" />
        <button type="button" className="fidelio-toolbar-btn h-full" title="Yazdır" onClick={() => window.print()}>
          <Printer className="h-4 w-4 text-primary" />
          <span className="text-[10px] text-foreground/70">Yazdır</span>
        </button>
        <div className="h-6 w-px bg-border mx-0.5" />
        <button type="button" className="fidelio-toolbar-btn h-full" onClick={() => window.location.reload()} title="Yenile">
          <RotateCcw className="h-4 w-4 text-primary" />
          <span className="text-[10px] text-foreground/70">Yenile</span>
        </button>
        <div className="h-6 w-px bg-border mx-0.5" />
        <div className="relative" ref={helpRef}>
          <button type="button" className="fidelio-toolbar-btn h-full" title="Yardım" onClick={() => setHelpOpen(!helpOpen)}>
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-foreground/70">Yardım</span>
          </button>
          {helpOpen && (
            <div className="absolute left-0 top-[38px] z-50 w-56 rounded-md border bg-popover shadow-lg">
              <div className="rounded-t-md border-b bg-primary px-2 py-1">
                <span className="text-[11px] font-bold text-white">Klavye Kısayolları</span>
              </div>
              <div className="p-2 space-y-1 text-[11px]">
                <div className="flex justify-between"><span>Dashboard</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F1</kbd></div>
                <div className="flex justify-between"><span>Rezervasyon</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F2</kbd></div>
                <div className="flex justify-between"><span>Rez. Takvimi</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F3</kbd></div>
                <div className="flex justify-between"><span>Resepsiyon</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F4</kbd></div>
                <div className="flex justify-between"><span>Odalar</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F5</kbd></div>
                <div className="flex justify-between"><span>Misafirler</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F6</kbd></div>
                <div className="flex justify-between"><span>Housekeeping</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F7</kbd></div>
                <div className="flex justify-between"><span>Raporlar</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F11</kbd></div>
                <div className="flex justify-between"><span>Night Audit</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F12</kbd></div>
                <div className="border-t pt-1 mt-1">
                  <div className="flex justify-between"><span>Ara</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">Ctrl+F</kbd></div>
                  <div className="flex justify-between"><span>Yazdır</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">Ctrl+P</kbd></div>
                  <div className="flex justify-between"><span>Yenile</span><kbd className="rounded bg-gray-200 px-1 text-[10px]">F5</kbd></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center - Title bar */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-bold text-primary">Creative PMS v1.0</span>
        <span className="text-[10px] text-foreground/60">|</span>
        <span className="text-[11px] font-semibold text-foreground/80">
          {session ? `${session.displayName} (${roleLabels[session.role] || session.role})` : ""}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center h-full">
        {/* Notification Bell */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            className="fidelio-toolbar-btn h-full relative"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-[10px] text-foreground/70">Mesaj</span>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-sm bg-red-600 px-0.5 text-[8px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[38px] z-50 w-72 rounded-md border bg-popover shadow-lg"
            >
              <div className="flex items-center justify-between rounded-t-md border-b bg-primary px-2 py-1">
                <span className="text-[11px] font-bold text-white">Bildirimler ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="text-[10px] text-amber-300 hover:underline">
                    Tümünü Oku
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-[11px] text-gray-500">Bildirim yok</span>
                  </div>
                ) : notifications.map((n) => {
                  const cfg = notifIcons[n.type] || notifIcons.alert;
                  const Icon = cfg.icon;
                  return (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        "flex w-full items-start gap-2 border-b px-2 py-1.5 text-left hover:bg-accent",
                        !n.read && "bg-primary/5 font-semibold"
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] truncate">{n.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">{n.description}</p>
                      </div>
                      <span className="shrink-0 text-[9px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
              {unreadCount === 0 && notifications.length > 0 && (
                <div className="flex items-center justify-center gap-1 border-t py-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-[10px]">Tüm bildirimler okundu</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border mx-0.5" />

        {/* Date/Time */}
        <div className="flex items-center gap-2 px-3">
          <span className="text-[11px] font-mono font-bold text-primary">{timeStr}</span>
          <span className="text-[10px] text-foreground/60">{dateStr}</span>
        </div>

        <div className="h-6 w-px bg-border mx-0.5" />

        {/* Logout */}
        <button type="button" className="fidelio-toolbar-btn h-full" title="Çıkış Yap" onClick={handleLogout}>
          <Power className="h-4 w-4 text-destructive" />
          <span className="text-[10px] text-foreground/70">Çıkış</span>
        </button>
      </div>
    </header>
  );
}
