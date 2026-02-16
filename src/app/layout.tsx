import type { Metadata } from "next";
import "./globals.css";
import { ClientShell } from "@/components/layout/client-shell";

export const metadata: Metadata = {
  title: "Creative PMS — Fidelio",
  description: "Creative Otel Yönetim Sistemi (Property Management System)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
