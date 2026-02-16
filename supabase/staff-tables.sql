-- ============================================
-- SUNPORT PMS - Personel Uygulamaları Tabloları
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================

-- 1) Personel
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('housekeeping','bar','maintenance','admin','front-desk','manager')),
  pin TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  floor_assigned INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Housekeeping Görevleri
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  task_type TEXT NOT NULL DEFAULT 'checkout' CHECK (task_type IN ('checkout','stayover','deep-clean','turndown','inspection','custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','inspected','skipped')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to UUID REFERENCES staff(id),
  assigned_to_name TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  inspected_by UUID REFERENCES staff(id),
  inspected_at TIMESTAMPTZ,
  duration_minutes INT,
  issues_found TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Bar Menü Öğeleri
CREATE TABLE IF NOT EXISTS bar_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sicak-icecek','soguk-icecek','alkol','atistirmalik','yemek','tatli','diger')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Bar Siparişleri
CREATE TABLE IF NOT EXISTS bar_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT,
  table_number TEXT,
  guest_name TEXT,
  order_type TEXT NOT NULL DEFAULT 'room-service' CHECK (order_type IN ('room-service','bar','pool','restaurant')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','ready','delivered','cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'room-charge',
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  created_by_name TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Teknik Bakım İş Emirleri
CREATE TABLE IF NOT EXISTS maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'genel' CHECK (category IN ('elektrik','tesisat','klima','mobilya','boya','asansor','havuz','bahce','genel','diger')),
  location TEXT NOT NULL,
  room_number TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','in_progress','waiting_parts','completed','cancelled')),
  assigned_to UUID REFERENCES staff(id),
  assigned_to_name TEXT,
  reported_by TEXT,
  notes TEXT,
  estimated_minutes INT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  parts_used TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on housekeeping_tasks" ON housekeeping_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bar_menu_items" ON bar_menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bar_orders" ON bar_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on maintenance_orders" ON maintenance_orders FOR ALL USING (true) WITH CHECK (true);

-- 7) Seed: Örnek Personel
INSERT INTO staff (name, role, pin, phone, floor_assigned) VALUES
  ('Ayşe Demir', 'housekeeping', '1234', '+90 532 111 0001', 1),
  ('Fatma Yılmaz', 'housekeeping', '1235', '+90 532 111 0002', 2),
  ('Zeynep Kaya', 'housekeeping', '1236', '+90 532 111 0003', 3),
  ('Mehmet Öz', 'bar', '2234', '+90 532 222 0001', NULL),
  ('Ali Çelik', 'bar', '2235', '+90 532 222 0002', NULL),
  ('Hasan Arslan', 'maintenance', '3234', '+90 532 333 0001', NULL),
  ('Osman Koç', 'maintenance', '3235', '+90 532 333 0002', NULL)
ON CONFLICT DO NOTHING;

-- 8) Seed: Örnek Bar Menü
INSERT INTO bar_menu_items (name, category, price, sort_order) VALUES
  ('Türk Kahvesi', 'sicak-icecek', 45, 1),
  ('Latte', 'sicak-icecek', 65, 2),
  ('Cappuccino', 'sicak-icecek', 60, 3),
  ('Çay', 'sicak-icecek', 25, 4),
  ('Filtre Kahve', 'sicak-icecek', 55, 5),
  ('Portakal Suyu', 'soguk-icecek', 50, 10),
  ('Limonata', 'soguk-icecek', 45, 11),
  ('Kola', 'soguk-icecek', 35, 12),
  ('Ayran', 'soguk-icecek', 25, 13),
  ('Su (0.5L)', 'soguk-icecek', 15, 14),
  ('Bira (Efes)', 'alkol', 85, 20),
  ('Şarap (Kadeh)', 'alkol', 120, 21),
  ('Rakı (tek)', 'alkol', 95, 22),
  ('Gin Tonic', 'alkol', 140, 23),
  ('Mojito', 'alkol', 150, 24),
  ('Karışık Kuruyemiş', 'atistirmalik', 75, 30),
  ('Patates Kızartması', 'atistirmalik', 65, 31),
  ('Club Sandwich', 'yemek', 120, 40),
  ('Caesar Salata', 'yemek', 110, 41),
  ('Burger', 'yemek', 140, 42),
  ('Cheesecake', 'tatli', 90, 50),
  ('Brownie', 'tatli', 75, 51)
ON CONFLICT DO NOTHING;

-- Başarılı!
