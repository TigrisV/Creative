"use client";

import React, { useState, useEffect } from "react";
import { getRoomsWithGuests, getReservations } from "@/lib/data-service";

export function StatusBar() {
  const [stats, setStats] = useState({ rooms: 0, occupied: 0, arrivals: 0, departures: 0, inHouse: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      try {
        const [rooms, reservations] = await Promise.all([getRoomsWithGuests(), getReservations()]);
        const today = new Date().toISOString().split("T")[0];
        setStats({
          rooms: rooms.length,
          occupied: rooms.filter((r) => r.status === "occupied").length,
          arrivals: reservations.filter((r) => r.checkIn === today && r.status === "confirmed").length,
          departures: reservations.filter((r) => r.checkOut === today && r.status === "checked-in").length,
          inHouse: reservations.filter((r) => r.status === "checked-in").length,
        });
      } catch { /* ignore */ }
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  if (!mounted) return null;

  const occ = stats.rooms > 0 ? Math.round((stats.occupied / stats.rooms) * 100) : 0;

  return (
    <div className="fidelio-statusbar flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span>
          Oda: <strong>{stats.occupied}</strong>/{stats.rooms}
        </span>
        <span className="text-border">|</span>
        <span>
          Doluluk: <strong>{occ}%</strong>
        </span>
        <span className="text-border">|</span>
        <span>
          Giriş: <strong>{stats.arrivals}</strong>
        </span>
        <span className="text-border">|</span>
        <span>
          Çıkış: <strong>{stats.departures}</strong>
        </span>
        <span className="text-border">|</span>
        <span>
          Konaklama: <strong>{stats.inHouse}</strong>
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-foreground/50">
        <span>DB: Supabase</span>
        <span className="text-border">|</span>
        <span>Creative PMS v1.0.0</span>
      </div>
    </div>
  );
}
