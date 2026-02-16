// ═══════════════════════════════════════════════════════════════════════
// Veri Yedekleme / Geri Yükleme Servisi
// localStorage verilerini JSON olarak dışa/içe aktarma
// ═══════════════════════════════════════════════════════════════════════

export interface BackupData {
  version: string;
  createdAt: string;
  hotelName: string;
  data: Record<string, string>;
}

const BACKUP_PREFIX = "creative_";
const BACKUP_VERSION = "1.0.0";

// ─── Yedek Al (Export) ──────────────────────────────────────────
export function createBackup(): BackupData {
  const data: Record<string, string> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) {
      data[key] = localStorage.getItem(key) || "";
    }
  }

  // Ek anahtarlar (prefix'siz)
  const extraKeys = ["pms_user_role"];
  for (const k of extraKeys) {
    const v = localStorage.getItem(k);
    if (v) data[k] = v;
  }

  let hotelName = "Creative Hotel";
  try {
    const hs = JSON.parse(data["creative_hotel_settings"] || "{}");
    if (hs.hotelName) hotelName = hs.hotelName;
  } catch {}

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    hotelName,
    data,
  };
}

// ─── Yedek İndir ───────────────────────────────────────────────
export function downloadBackup(): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0];
  const filename = `creative-pms-backup-${date}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Yedek Yükle (Import) ──────────────────────────────────────
export function restoreBackup(backup: BackupData): { success: boolean; error?: string; keysRestored: number } {
  try {
    if (!backup.version || !backup.data) {
      return { success: false, error: "Geçersiz yedek dosyası formatı", keysRestored: 0 };
    }

    let count = 0;
    for (const [key, value] of Object.entries(backup.data)) {
      localStorage.setItem(key, value);
      count++;
    }

    return { success: true, keysRestored: count };
  } catch (err: any) {
    return { success: false, error: err?.message || "Yedek yükleme hatası", keysRestored: 0 };
  }
}

// ─── Dosyadan yedek oku ─────────────────────────────────────────
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const backup = JSON.parse(json) as BackupData;
        if (!backup.version || !backup.data) {
          reject(new Error("Geçersiz yedek dosyası"));
          return;
        }
        resolve(backup);
      } catch {
        reject(new Error("JSON parse hatası — geçersiz dosya"));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.readAsText(file);
  });
}

// ─── Yedek bilgileri ────────────────────────────────────────────
export function getBackupStats(): { keyCount: number; estimatedSize: string } {
  let totalSize = 0;
  let keyCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) {
      const value = localStorage.getItem(key) || "";
      totalSize += key.length + value.length;
      keyCount++;
    }
  }

  const sizeKB = (totalSize * 2) / 1024; // UTF-16
  const estimatedSize = sizeKB > 1024
    ? `${(sizeKB / 1024).toFixed(1)} MB`
    : `${sizeKB.toFixed(0)} KB`;

  return { keyCount, estimatedSize };
}

// ─── Tüm verileri sil ──────────────────────────────────────────
export function clearAllData(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
