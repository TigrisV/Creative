-- Bildirim tablosu
CREATE TABLE IF NOT EXISTS pms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'alert' CHECK (type IN ('housekeeping','checkin','checkout','payment','maintenance','alert')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  room_number TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pms_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on pms_notifications" ON pms_notifications FOR ALL USING (true) WITH CHECK (true);
