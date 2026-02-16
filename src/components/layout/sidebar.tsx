"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, roleNavConfig, roleLabels } from "@/lib/auth-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  CalendarCheck,
  ConciergeBell,
  BedDouble,
  Users,
  Sparkles,
  Receipt,
  BarChart3,
  Settings,
  Moon,
  CalendarRange,
  ArrowRightLeft,
  Building2,
  UserCog,
  ShieldCheck,
  ClipboardList,
  Layers,
  TrendingUp,
} from "lucide-react";

const navigation = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "F1" },
  { title: "Rezervasyon", href: "/reservations", icon: CalendarCheck, shortcut: "F2" },
  { title: "Rez. Takvimi", href: "/reservation-grid", icon: CalendarRange, shortcut: "F3" },
  { title: "Resepsiyon", href: "/front-desk", icon: ConciergeBell, shortcut: "F4" },
  { title: "Odalar", href: "/rooms", icon: BedDouble, shortcut: "F5" },
  { title: "Misafirler", href: "/guests", icon: Users, shortcut: "F6" },
  { title: "Housekeeping", href: "/housekeeping", icon: Sparkles, shortcut: "F7" },
  { title: "Personel", href: "/staff", icon: UserCog, shortcut: "F8" },
  { title: "Kasa / Folio", href: "/billing", icon: Receipt, shortcut: "F9" },
  { title: "Fiyat Yönet.", href: "/rate-plans", icon: TrendingUp, shortcut: "" },
  { title: "Kanal Senk.", href: "/channel-sync", icon: ArrowRightLeft, shortcut: "" },
  { title: "Ajanslar", href: "/agencies", icon: Building2, shortcut: "" },
  { title: "Oda Kotası", href: "/allotment", icon: Layers, shortcut: "" },
  { title: "Raporlar", href: "/reports", icon: BarChart3, shortcut: "F11" },
  { title: "Mgr Report", href: "/manager-report", icon: ClipboardList, shortcut: "" },
  { title: "Night Audit", href: "/night-audit", icon: Moon, shortcut: "F12" },
];

const bottomNavigation = [
  { title: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasAccess, setRole } = useAuth();

  const visibleNavigation = navigation.filter((item) => {
    const requiredRole = roleNavConfig[item.href];
    return !requiredRole || hasAccess(requiredRole);
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative flex h-screen w-[76px] flex-col border-r border-[#0a1020]"
        style={{ background: "linear-gradient(180deg, #0f1b35 0%, #0a1428 100%)" }}
      >
        {/* Logo */}
        <div className="flex h-[52px] items-center justify-center border-b border-[#1a2a4a]">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black tracking-wider text-amber-400">PMS</span>
            <span className="text-[8px] font-bold tracking-[0.2em] text-blue-300/50">CREATIVE</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin">
          <nav className="flex flex-col items-center">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex w-full flex-col items-center gap-[2px] px-1 py-[7px] text-center transition-all",
                        isActive
                          ? "bg-[#1a3060] text-white"
                          : "text-blue-200/50 hover:bg-[#152040] hover:text-blue-100/80"
                      )}
                      style={isActive ? {
                        borderLeft: "3px solid #f0c040",
                        borderRight: "3px solid transparent",
                      } : {
                        borderLeft: "3px solid transparent",
                        borderRight: "3px solid transparent",
                      }}
                    >
                      <Icon className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive ? "text-amber-400" : "text-blue-300/40 group-hover:text-blue-200/70"
                      )} />
                      <span className={cn(
                        "text-[9px] font-semibold leading-tight",
                        isActive ? "text-amber-300" : ""
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={4} className="rounded-md border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md">
                    {item.title}{item.shortcut ? ` (${item.shortcut})` : ""}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="border-t border-[#1a2a4a]">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex w-full flex-col items-center gap-[2px] px-1 py-[7px] transition-all",
                      isActive
                        ? "bg-[#1a3060] text-white"
                        : "text-blue-200/50 hover:bg-[#152040] hover:text-blue-100/80"
                    )}
                  >
                    <Icon className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-amber-400" : "text-blue-300/40"
                    )} />
                    <span className="text-[9px] font-semibold">{item.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={4} className="rounded-md border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* User indicator + role switcher */}
          <div className="flex flex-col items-center border-t border-[#1a2a4a] py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const roles = ["receptionist", "manager", "admin"] as const;
                    const idx = roles.indexOf(user.role);
                    setRole(roles[(idx + 1) % roles.length]);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-none bg-amber-500/20 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  {user.initials}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={4} className="rounded-none border-[#808080] bg-[#ffffe1] px-2 py-1 text-[11px] font-medium text-black shadow-md">
                Rol değiştir (tıkla)
              </TooltipContent>
            </Tooltip>
            <span className="mt-[2px] text-[8px] text-blue-300/40">{roleLabels[user.role]}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
