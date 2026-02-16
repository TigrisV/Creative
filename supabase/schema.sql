-- ============================================
-- OTEL PMS - Supabase PostgreSQL Veritabanı Şeması
-- ============================================

-- ENUM Tipleri
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'front_desk', 'housekeeping', 'accounting');
CREATE TYPE room_status AS ENUM ('vacant_clean', 'vacant_dirty', 'occupied', 'out_of_order', 'maintenance');
CREATE TYPE housekeeping_status AS ENUM ('clean', 'dirty', 'inspected', 'in_progress', 'out_of_service');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE folio_type AS ENUM ('charge', 'payment', 'adjustment');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'bank_transfer', 'online', 'city_ledger');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ============================================
-- STAFF (Personel / Kullanıcılar)
-- ============================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'front_desk',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROOM TYPES (Oda Tipleri)
-- ============================================
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_occupancy INT NOT NULL DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROOMS (Odalar)
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  floor INT NOT NULL DEFAULT 1,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  status room_status NOT NULL DEFAULT 'vacant_clean',
  housekeeping_status housekeeping_status NOT NULL DEFAULT 'clean',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_floor ON rooms(floor);
CREATE INDEX idx_rooms_room_type ON rooms(room_type_id);

-- ============================================
-- GUESTS (Misafirler)
-- ============================================
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  nationality TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  country TEXT,
  vip_level INT NOT NULL DEFAULT 0,
  total_stays INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_name ON guests(last_name, first_name);
CREATE INDEX idx_guests_email ON guests(email);

-- ============================================
-- RESERVATIONS (Rezervasyonlar)
-- ============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_number TEXT UNIQUE NOT NULL,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL DEFAULT 1,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  rate_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'direct',
  meal_plan TEXT DEFAULT 'BB',
  special_requests TEXT,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_number);

-- ============================================
-- FOLIOS (Misafir Hesapları)
-- ============================================
CREATE TABLE folios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  room_number TEXT,
  total_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_payments NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folios_reservation ON folios(reservation_id);
CREATE INDEX idx_folios_guest ON folios(guest_id);

-- ============================================
-- TRANSACTIONS (Folio İşlemleri / Hareketler)
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'room',
  type folio_type NOT NULL DEFAULT 'charge',
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method,
  payment_status payment_status DEFAULT 'completed',
  reference TEXT,
  is_night_audit BOOLEAN NOT NULL DEFAULT false,
  posted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_folio ON transactions(folio_id);
CREATE INDEX idx_transactions_reservation ON transactions(reservation_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- ============================================
-- HOUSEKEEPING TASKS (Temizlik Görevleri)
-- ============================================
CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status housekeeping_status NOT NULL DEFAULT 'dirty',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hk_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_tasks_status ON housekeeping_tasks(status);
CREATE INDEX idx_hk_tasks_assigned ON housekeeping_tasks(assigned_to);

-- ============================================
-- NIGHT AUDIT LOG (Gece Denetim Kayıtları)
-- ============================================
CREATE TABLE night_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date DATE UNIQUE NOT NULL,
  run_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  total_rooms INT NOT NULL DEFAULT 0,
  occupied_rooms INT NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  room_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  fnb_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_arrivals INT NOT NULL DEFAULT 0,
  total_departures INT NOT NULL DEFAULT 0,
  total_no_shows INT NOT NULL DEFAULT 0,
  rooms_posted INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_night_audit_date ON night_audit_logs(audit_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar tüm verilere erişebilir (otel iç sistemi)
CREATE POLICY "Authenticated users can read all" ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON room_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON folios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON housekeeping_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON night_audit_logs FOR SELECT TO authenticated USING (true);

-- Admin ve Manager tüm CRUD işlemleri yapabilir
CREATE POLICY "Staff can insert" ON staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON room_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON room_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON rooms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON guests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON reservations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON folios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON folios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON housekeeping_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON housekeeping_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON night_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON night_audit_logs FOR UPDATE TO authenticated USING (true);

-- ============================================
-- TRIGGERS: updated_at otomatik güncelleme
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_room_types_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_folios_updated_at BEFORE UPDATE ON folios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hk_tasks_updated_at BEFORE UPDATE ON housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTIONS: Folio bakiye otomatik hesaplama
-- ============================================
CREATE OR REPLACE FUNCTION update_folio_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE folios SET
    total_charges = COALESCE((
      SELECT SUM(amount) FROM transactions WHERE folio_id = NEW.folio_id AND type = 'charge'
    ), 0),
    total_payments = COALESCE((
      SELECT SUM(ABS(amount)) FROM transactions WHERE folio_id = NEW.folio_id AND type = 'payment'
    ), 0),
    balance = COALESCE((
      SELECT SUM(CASE WHEN type = 'charge' THEN amount WHEN type = 'payment' THEN -ABS(amount) ELSE amount END)
      FROM transactions WHERE folio_id = NEW.folio_id
    ), 0),
    updated_at = now()
  WHERE id = NEW.folio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transaction_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_folio_balance();

-- ============================================
-- FUNCTIONS: Konfirmasyon numarası üretici
-- ============================================
CREATE OR REPLACE FUNCTION generate_confirmation_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'RES';
  seq_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(confirmation_number FROM 4) AS INT)), 10000) + 1
  INTO seq_num
  FROM reservations
  WHERE confirmation_number LIKE 'RES%';
  RETURN prefix || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CHANNEL PARTNERS (Ajans/OTA Bağlantıları)
-- ============================================
CREATE TYPE channel_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE sync_direction AS ENUM ('inbound', 'outbound', 'both');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed', 'conflict');

CREATE TABLE channel_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id TEXT UNIQUE NOT NULL,           -- booking, expedia, etstur vb.
  name TEXT NOT NULL,
  status channel_status NOT NULL DEFAULT 'disconnected',
  credentials JSONB NOT NULL DEFAULT '{}',  -- şifreli API key'ler
  settings JSONB NOT NULL DEFAULT '{}',     -- rate mapping, oda eşleştirme vb.
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_direction sync_direction NOT NULL DEFAULT 'both',
  webhook_url TEXT,                          -- gelen webhook URL
  webhook_secret TEXT,                       -- webhook doğrulama secret
  rate_mapping JSONB DEFAULT '{}',           -- ajans oda tipi -> PMS oda tipi eşleştirme
  commission_rate NUMERIC(5,2) DEFAULT 0,    -- komisyon oranı %
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_partners_agency ON channel_partners(agency_id);
CREATE INDEX idx_channel_partners_status ON channel_partners(status);

-- ============================================
-- CHANNEL RESERVATIONS (Ajans Rezervasyonları)
-- ============================================
CREATE TABLE channel_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_partner_id UUID NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,                 -- ajansın kendi rez ID'si
  external_confirmation TEXT,                -- ajans konfirmasyon no
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL, -- PMS'deki eşlenmiş rez
  raw_data JSONB NOT NULL DEFAULT '{}',      -- ajansdan gelen ham veri
  guest_name TEXT,
  room_type TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status reservation_status NOT NULL DEFAULT 'confirmed',
  sync_status sync_status NOT NULL DEFAULT 'pending',
  synced_at TIMESTAMPTZ,
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_channel_external UNIQUE (channel_partner_id, external_id)
);

CREATE INDEX idx_channel_res_partner ON channel_reservations(channel_partner_id);
CREATE INDEX idx_channel_res_reservation ON channel_reservations(reservation_id);
CREATE INDEX idx_channel_res_dates ON channel_reservations(check_in, check_out);
CREATE INDEX idx_channel_res_sync ON channel_reservations(sync_status);
CREATE INDEX idx_channel_res_external ON channel_reservations(external_id);

-- ============================================
-- CHANNEL SYNC LOGS (Senkronizasyon Kayıtları)
-- ============================================
CREATE TABLE channel_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_partner_id UUID NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  direction sync_direction NOT NULL,
  action TEXT NOT NULL,                      -- reservation_create, reservation_update, rate_update, availability_update
  status sync_status NOT NULL DEFAULT 'pending',
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  error_message TEXT,
  external_id TEXT,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  duration_ms INT,                           -- işlem süresi
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_partner ON channel_sync_logs(channel_partner_id);
CREATE INDEX idx_sync_logs_status ON channel_sync_logs(status);
CREATE INDEX idx_sync_logs_date ON channel_sync_logs(created_at);

-- ============================================
-- CHANNEL RATE PLANS (Ajans Fiyat Planları)
-- ============================================
CREATE TABLE channel_rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_partner_id UUID NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  external_room_code TEXT,                   -- ajansın oda kodu
  rate_per_night NUMERIC(10,2) NOT NULL,
  min_stay INT DEFAULT 1,
  max_stay INT DEFAULT 30,
  closed BOOLEAN DEFAULT false,              -- satışa kapalı mı
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_rate_plan UNIQUE (channel_partner_id, room_type_id, valid_from)
);

CREATE INDEX idx_rate_plans_partner ON channel_rate_plans(channel_partner_id);
CREATE INDEX idx_rate_plans_room ON channel_rate_plans(room_type_id);

-- RLS
ALTER TABLE channel_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all" ON channel_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON channel_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON channel_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can delete" ON channel_partners FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON channel_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON channel_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON channel_reservations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON channel_sync_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON channel_sync_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read all" ON channel_rate_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert" ON channel_rate_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update" ON channel_rate_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can delete" ON channel_rate_plans FOR DELETE TO authenticated USING (true);

-- Triggers
CREATE TRIGGER trg_channel_partners_updated_at BEFORE UPDATE ON channel_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_channel_reservations_updated_at BEFORE UPDATE ON channel_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_channel_rate_plans_updated_at BEFORE UPDATE ON channel_rate_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REALTIME: Supabase Realtime etkinleştirme
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE housekeeping_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_sync_logs;
