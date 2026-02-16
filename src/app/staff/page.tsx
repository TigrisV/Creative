"use client";

import { useStaff } from "./staff-context";
import Link from "next/link";
import { Bed, Wine, Wrench, ArrowRight } from "lucide-react";

const apps = [
  { role: "housekeeping", title: "Kat Hizmeti", desc: "Oda temizlik görevleri", href: "/staff/housekeeping", icon: Bed, color: "bg-emerald-500", lightBg: "bg-emerald-50", textColor: "text-emerald-700" },
  { role: "bar", title: "Bar & Servis", desc: "Sipariş yönetimi", href: "/staff/bar", icon: Wine, color: "bg-amber-500", lightBg: "bg-amber-50", textColor: "text-amber-700" },
  { role: "maintenance", title: "Teknik Bakım", desc: "İş emirleri ve arıza takibi", href: "/staff/maintenance", icon: Wrench, color: "bg-blue-500", lightBg: "bg-blue-50", textColor: "text-blue-700" },
];

export default function StaffPortalPage() {
  const { staff } = useStaff();

  const filtered = staff.role === "admin" || staff.role === "manager"
    ? apps
    : apps.filter((a) => a.role === staff.role);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-lg font-bold">Hoş geldiniz, {staff.name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">Çalışmak istediğiniz uygulamayı seçin</p>
      </div>

      <div className="space-y-3">
        {filtered.map((app) => (
          <Link key={app.role} href={app.href}>
            <div className={`${app.lightBg} rounded-xl p-4 flex items-center gap-4 border border-transparent hover:border-gray-200 transition-all active:scale-[0.98]`}>
              <div className={`${app.color} h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <app.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className={`text-[15px] font-semibold ${app.textColor}`}>{app.title}</h2>
                <p className="text-[12px] text-muted-foreground">{app.desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Rolünüze atanmış bir uygulama bulunamadı.
        </div>
      )}
    </div>
  );
}
