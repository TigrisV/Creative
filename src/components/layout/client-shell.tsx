"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatusBar } from "@/components/layout/status-bar";
import { getSession, ensureDefaultUsers } from "@/lib/auth-service";

const PUBLIC_PATHS = ["/login"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isStaffPage = pathname.startsWith("/staff");

  useEffect(() => {
    ensureDefaultUsers().then(() => {
      const session = getSession();
      if (!session && !isPublic) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    });
  }, [pathname, isPublic, router]);

  // Login sayfası — sidebar/header yok
  if (isPublic) {
    return <>{children}</>;
  }

  // Oturum kontrolü tamamlanana kadar bekle
  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Staff sayfaları — kendi layout'u var
  if (isStaffPage) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-3 scrollbar-thin">
            {children}
          </main>
          <StatusBar />
        </div>
      </div>
    </AuthProvider>
  );
}
