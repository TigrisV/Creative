"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, isLoggedIn, ensureDefaultUsers } from "@/lib/auth-service";
import { getHotelSettings } from "@/lib/hotel-settings";
import { LogIn, Loader2, AlertCircle, Hotel, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hotelName, setHotelName] = useState("Creative PMS");

  useEffect(() => {
    ensureDefaultUsers();
    setHotelName(getHotelSettings().hotelName);
    if (isLoggedIn()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    const result = await login(username.trim(), password);
    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error || "Giriş başarısız");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Hotel Name */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white mb-3">
            <Hotel className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{hotelName}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Otel Yönetim Sistemi</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] text-center">Giriş Yap</CardTitle>
            <CardDescription className="text-[12px] text-center">
              Kullanıcı adı ve şifrenizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-[12px] text-destructive font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Kullanıcı Adı</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Şifre</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre"
                    autoComplete="current-password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !username.trim() || !password.trim()}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Giriş Yap
              </Button>
            </form>

            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Varsayılan Kullanıcılar</p>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground"><strong>admin</strong> / admin123 — Yönetici</p>
                <p className="text-[11px] text-muted-foreground"><strong>resepsiyon</strong> / reception123 — Resepsiyonist</p>
                <p className="text-[11px] text-muted-foreground"><strong>mudur</strong> / manager123 — Müdür</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Creative PMS v1.0.0
        </p>
      </div>
    </div>
  );
}
