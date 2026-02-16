-- ============================================
-- SUNPORT OTEL PMS - Minimal Tablo Şeması
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================

-- 1) Oda Tipleri
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 1800,
  max_occupancy INT NOT NULL DEFAULT 2,
  amenities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Misafirler
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  id_number TEXT,
  nationality TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  country TEXT,
  vip_level INT DEFAULT 0,
  notes TEXT,
  total_stays INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Odalar
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  room_type_id UUID REFERENCES room_types(id),
  status TEXT NOT NULL DEFAULT 'vacant_clean',
  housekeeping_status TEXT NOT NULL DEFAULT 'clean',
  current_guest_id UUID REFERENCES guests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Rezervasyonlar
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_number TEXT UNIQUE NOT NULL,
  guest_id UUID NOT NULL REFERENCES guests(id),
  room_type_id UUID REFERENCES room_types(id),
  room_id UUID REFERENCES rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL DEFAULT 1,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  rate_per_night NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'Direkt',
  special_requests TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) RLS (Row Level Security) - Herkese açık okuma/yazma (geliştirme için)
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Geliştirme aşamasında tüm erişimi aç
CREATE POLICY "Allow all on room_types" ON room_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on guests" ON guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);

-- Başarılı!
-- Tablolar oluşturuldu. Uygulama ilk açılışta otomatik olarak
-- örnek verileri (mock data) bu tablolara yükleyecektir.
