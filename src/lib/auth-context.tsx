"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "receptionist" | "manager" | "admin";

export interface AuthUser {
  name: string;
  initials: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser;
  setRole: (role: UserRole) => void;
  hasAccess: (requiredRole: UserRole) => boolean;
}

const roleHierarchy: Record<UserRole, number> = {
  receptionist: 1,
  manager: 2,
  admin: 3,
};

const defaultUser: AuthUser = {
  name: "Admin Yönetici",
  initials: "AY",
  role: "manager",
};

function getStoredRole(): UserRole {
  if (typeof window === "undefined") return defaultUser.role;
  try {
    const stored = localStorage.getItem("pms_user_role");
    if (stored === "receptionist" || stored === "manager" || stored === "admin") return stored;
  } catch { /* ignore */ }
  return defaultUser.role;
}

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  setRole: () => {},
  hasAccess: () => true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(() => ({
    ...defaultUser,
    role: getStoredRole(),
  }));

  const setRole = useCallback((role: UserRole) => {
    setUser((prev) => ({ ...prev, role }));
    if (typeof window !== "undefined") {
      localStorage.setItem("pms_user_role", role);
    }
  }, []);

  const hasAccess = useCallback(
    (requiredRole: UserRole) => roleHierarchy[user.role] >= roleHierarchy[requiredRole],
    [user.role]
  );

  return (
    <AuthContext.Provider value={{ user, setRole, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Navigation items with required roles
export const roleNavConfig: Record<string, UserRole> = {
  "/dashboard": "receptionist",
  "/reservations": "receptionist",
  "/reservation-grid": "receptionist",
  "/front-desk": "receptionist",
  "/rooms": "receptionist",
  "/guests": "receptionist",
  "/housekeeping": "receptionist",
  "/staff": "manager",
  "/billing": "manager",
  "/channel-sync": "manager",
  "/agencies": "manager",
  "/rate-plans": "manager",
  "/reports": "manager",
  "/manager-report": "manager",
  "/night-audit": "manager",
  "/settings": "admin",
};

export const roleLabels: Record<UserRole, string> = {
  receptionist: "Resepsiyonist",
  manager: "Müdür",
  admin: "Yönetici",
};
