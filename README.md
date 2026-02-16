# Creative PMS - Otel Yönetim Sistemi

Fidelio/Opera PMS benzeri, modern ve kapsamlı bir otel yönetim sistemi. Masaüstü uygulaması (Windows .exe) ve web olarak çalışır.

## Teknoloji Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI:** TailwindCSS, shadcn/ui, Lucide Icons
- **Masaüstü:** Tauri 2 (Rust) — Windows .exe / .msi
- **Veritabanı:** Supabase (PostgreSQL) + localStorage fallback
- **Tema:** Fidelio PMS tarzı klasik otel arayüzü

## Modüller

| Modül | Açıklama |
|---|---|
| Dashboard | Doluluk, gelir, KPI'lar, günlük özet |
| Rezervasyonlar | Arama, yeni/düzenle/kopyala, durum yönetimi |
| Rezervasyon Takvimi | Grid görünüm, sürükle-bırak |
| Resepsiyon | Adım adım check-in/check-out, kimlik tarama |
| Oda Yönetimi | Kat planı, durum grid, oda detayları |
| Misafir Profilleri | 8 sekmeli profil, konaklama geçmişi, tercihler |
| Housekeeping | Temizlik görevleri, personel atama, inspeksiyon |
| Kasa / Folio | Hesap, masraf ekleme, ödeme, KDV, fatura yazdırma |
| Raporlar | Doluluk, gelir, forecast, segmentasyon, yazdırma |
| Night Audit | Otomatik gece kapanışı, no-show, oda masrafı |
| Ajans Entegrasyonu | Booking, Expedia, ETS, Jolly bağlantıları |
| Personel Portalı | Kat hizmeti, bar sipariş, teknik bakım |
| Ayarlar | Otel bilgileri, kullanıcılar, roller, tema |

## Kurulum

### Web olarak çalıştırma

```bash
npm install
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

### Masaüstü uygulaması (Tauri)

```bash
# Gereksinimler: Rust, Visual Studio Build Tools
npm run tauri:dev    # Geliştirme modu
npm run tauri:build  # .exe / .msi üretir
```

### Veritabanı (opsiyonel)

Supabase olmadan localStorage ile çalışır. Supabase kullanmak için:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ayarlayın
# supabase/schema.sql dosyasını Supabase SQL Editor'da çalıştırın
```

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router sayfaları
│   ├── dashboard/          # Dashboard
│   ├── reservations/       # Rezervasyonlar
│   ├── reservation-grid/   # Rezervasyon Takvimi
│   ├── front-desk/         # Resepsiyon
│   ├── rooms/              # Oda Yönetimi
│   ├── guests/             # Misafir Profilleri
│   ├── housekeeping/       # Housekeeping
│   ├── billing/            # Kasa / Folio
│   ├── reports/            # Raporlar
│   ├── night-audit/        # Night Audit
│   ├── manager-report/     # Yönetici Raporu
│   ├── agencies/           # Ajans Yönetimi
│   ├── channel-sync/       # Kanal Senkronizasyonu
│   ├── staff/              # Personel Portalı
│   └── settings/           # Ayarlar
├── components/
│   ├── ui/                 # shadcn/ui bileşenleri
│   └── layout/             # Sidebar, Header, StatusBar
├── lib/
│   ├── data-service.ts     # Veri katmanı (Supabase + localStorage)
│   ├── auth-service.ts     # Kullanıcı login / oturum yönetimi
│   ├── hotel-settings.ts   # Merkezi otel ayarları servisi
│   ├── kbs-service.ts      # KBS (Emniyet) misafir bildirimi
│   ├── einvoice-service.ts # e-Fatura / e-Arşiv (UBL-TR)
│   ├── rate-service.ts     # Sezonluk fiyatlandırma
│   ├── payment-gateway.ts  # Sanal POS (iyzico, PayTR vb.)
│   ├── backup-service.ts   # Veri yedekleme / geri yükleme
│   ├── license-service.ts  # Lisans sistemi
│   ├── group-reservation-service.ts # Grup rezervasyonu
│   ├── staff-service.ts    # Personel servisleri
│   ├── night-audit-service.ts
│   ├── notification-service.ts
│   ├── channel-manager.ts  # Ajans entegrasyonu
│   ├── print-utils.ts      # Yazdırma (fiş, fatura, KDV)
│   ├── types.ts            # TypeScript tipleri
│   └── mock-data.ts        # Varsayılan veriler
├── supabase/
│   └── schema.sql          # Veritabanı şeması
└── src-tauri/              # Tauri masaüstü uygulaması
    ├── tauri.conf.json
    └── src/
```

## Lisans

MIT
