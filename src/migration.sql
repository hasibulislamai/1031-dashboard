-- Run this in Supabase SQL Editor to set up API keys table
-- and outgoing webhook settings

CREATE TABLE IF NOT EXISTS wb_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last4 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wb_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  hourly_rate NUMERIC DEFAULT 150,
  fee_percent NUMERIC DEFAULT 1,
  subscription_cost NUMERIC DEFAULT 500,
  webhook_outgoing TEXT DEFAULT '',
  notif_email_deadlines BOOLEAN DEFAULT TRUE,
  notif_failed_login BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO wb_settings (user_email) 
SELECT 'admin@wealthbuilder1031.com'
WHERE NOT EXISTS (SELECT 1 FROM wb_settings);

-- Enable Row Level Security
ALTER TABLE wb_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE wb_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated" ON wb_api_keys FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON wb_settings FOR ALL USING (true);
