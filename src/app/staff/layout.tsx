"use client";

import React, { useState, useEffect } from "react";
import type { Staff } from "@/lib/types";
import { loginStaff } from "@/lib/staff-service";
import { StaffContext } from "./staff-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Hotel, LogOut } from "lucide-react";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("creative_staff_session");
    if (saved) {
      try { setStaff(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setHydrated(true);
  }, []);

  const handleLogin = async () => {
    if (pin.length < 4) { setError("En az 4 haneli PIN girin"); return; }
    setLoading(true);
    setError("");
    try {
      const s = await loginStaff(pin);
      if (s) {
        setStaff(s);
        localStorage.setItem("creative_staff_session", JSON.stringify(s));
      } else {
        setError("Geçersiz PIN kodu");
      }
    } catch {
      setError("Bağlantı hatası");
    }
    setLoading(false);
  };

  const logout = () => {
    setStaff(null);
    setPin("");
    localStorage.removeItem("creative_staff_session");
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-xl p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 mb-4">
              <Hotel className="h-8 w-8 text-blue-300" />
            </div>
            <h1 className="text-xl font-bold text-white">Creative</h1>
            <p className="text-sm text-blue-200/70 mt-1">Personel Girişi</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60" />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="PIN Kodunuz"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-blue-200/40 text-center text-lg tracking-[0.5em] font-mono"
              />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button
              onClick={handleLogin}
              disabled={loading || pin.length < 4}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </div>

          <div className="mt-6 rounded-lg bg-white/5 p-3 border border-white/10">
            <p className="text-[10px] text-blue-200/50 text-center mb-2">Demo PIN Kodları</p>
            <div className="grid grid-cols-3 gap-1 text-[10px] text-blue-200/40 text-center">
              <span>Kat: 1234</span>
              <span>Bar: 2234</span>
              <span>Teknik: 3234</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StaffContext.Provider value={{ staff, logout }}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Hotel className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{staff.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{staff.role === "housekeeping" ? "Kat Hizmeti" : staff.role === "bar" ? "Bar" : staff.role === "maintenance" ? "Teknik" : staff.role}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </StaffContext.Provider>
  );
}
