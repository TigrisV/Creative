"use client";

import { createContext, useContext } from "react";
import type { Staff } from "@/lib/types";

interface StaffCtx {
  staff: Staff;
  logout: () => void;
}

export const StaffContext = createContext<StaffCtx | null>(null);

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffLayout");
  return ctx;
}
