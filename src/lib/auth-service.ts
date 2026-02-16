// ═══════════════════════════════════════════════════════════════════════
// Gerçek Kimlik Doğrulama Servisi
// Kullanıcı adı / şifre ile giriş, oturum yönetimi
// ═══════════════════════════════════════════════════════════════════════

const LS_USERS = "creative_auth_users";
const LS_SESSION = "creative_auth_session";

export type AuthRole = "admin" | "manager" | "receptionist" | "housekeeping" | "accounting" | "bartender";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: AuthRole;
  isActive: boolean;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: AuthRole;
  loginAt: string;
  expiresAt: string;
}

// ─── Basit hash (production'da bcrypt kullanılmalı) ──────────────
async function simpleHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "creative_pms_salt_2024");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: basit hash
  let hash = 0;
  const str = password + "creative_pms_salt_2024";
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ─── Varsayılan kullanıcılar ────────────────────────────────────
const defaultPasswordHash = ""; // İlk başta hash hesaplanacak

async function getDefaultUsers(): Promise<AuthUser[]> {
  const hash = await simpleHash("admin123");
  const receptionHash = await simpleHash("reception123");
  const managerHash = await simpleHash("manager123");
  return [
    {
      id: "auth-1",
      username: "admin",
      displayName: "Sistem Yöneticisi",
      email: "admin@creativehotel.com",
      role: "admin",
      isActive: true,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    },
    {
      id: "auth-2",
      username: "resepsiyon",
      displayName: "Resepsiyon Görevlisi",
      email: "resepsiyon@creativehotel.com",
      role: "receptionist",
      isActive: true,
      passwordHash: receptionHash,
      createdAt: new Date().toISOString(),
    },
    {
      id: "auth-3",
      username: "mudur",
      displayName: "Otel Müdürü",
      email: "mudur@creativehotel.com",
      role: "manager",
      isActive: true,
      passwordHash: managerHash,
      createdAt: new Date().toISOString(),
    },
  ];
}

// ─── Kullanıcı yönetimi ─────────────────────────────────────────
function getUsers(): AuthUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveUsers(users: AuthUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export async function ensureDefaultUsers(): Promise<void> {
  const existing = getUsers();
  if (existing.length > 0) return;
  const defaults = await getDefaultUsers();
  saveUsers(defaults);
}

export function getAllAuthUsers(): AuthUser[] {
  return getUsers().map((u) => ({ ...u, passwordHash: "***" }));
}

// ─── Login ──────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  await ensureDefaultUsers();
  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return { success: false, error: "Kullanıcı bulunamadı" };
  }

  if (!user.isActive) {
    return { success: false, error: "Hesap devre dışı" };
  }

  const inputHash = await simpleHash(password);
  if (inputHash !== user.passwordHash) {
    return { success: false, error: "Şifre yanlış" };
  }

  // Oturum oluştur (8 saat)
  const session: AuthSession = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(LS_SESSION, JSON.stringify(session));
  }

  // Son giriş güncelle
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx].lastLoginAt = new Date().toISOString();
    saveUsers(users);
  }

  return { success: true, session };
}

// ─── Oturum kontrolü ────────────────────────────────────────────
export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    // Süre kontrolü
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(LS_SESSION);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

// ─── Logout ─────────────────────────────────────────────────────
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LS_SESSION);
  }
}

// ─── Kullanıcı oluştur ─────────────────────────────────────────
export async function createAuthUser(
  username: string,
  displayName: string,
  email: string,
  password: string,
  role: AuthRole,
): Promise<{ success: boolean; error?: string }> {
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: "Bu kullanıcı adı zaten mevcut" };
  }

  const hash = await simpleHash(password);
  users.push({
    id: `auth-${Date.now()}`,
    username,
    displayName,
    email,
    role,
    isActive: true,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
  return { success: true };
}

// ─── Şifre değiştir ─────────────────────────────────────────────
export async function changePassword(
  userId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, error: "Kullanıcı bulunamadı" };

  users[idx].passwordHash = await simpleHash(newPassword);
  saveUsers(users);
  return { success: true };
}

// ─── Kullanıcı güncelle ─────────────────────────────────────────
export function updateAuthUser(
  userId: string,
  updates: { displayName?: string; email?: string; role?: AuthRole; isActive?: boolean },
): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return;
  Object.assign(users[idx], updates);
  saveUsers(users);
}

// ─── Kullanıcı sil ──────────────────────────────────────────────
export function deleteAuthUser(userId: string): void {
  const users = getUsers();
  saveUsers(users.filter((u) => u.id !== userId));
}

// ─── Rol etiketleri ─────────────────────────────────────────────
export const roleLabels: Record<AuthRole, string> = {
  admin: "Yönetici",
  manager: "Müdür",
  receptionist: "Resepsiyonist",
  housekeeping: "Kat Hizmetleri",
  accounting: "Muhasebe",
  bartender: "Barmen",
};
