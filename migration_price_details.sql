-- Migration: Add price_details column to tour_bookings and transfer_bookings
-- Run this in BOTH Supabase SQL Editor AND MySQL (Plesk)

-- ============================================
-- For Supabase (JSONB type)
-- ============================================
ALTER TABLE tour_bookings ADD COLUMN IF NOT EXISTS price_details JSONB DEFAULT '[]';
ALTER TABLE transfer_bookings ADD COLUMN IF NOT EXISTS price_details JSONB DEFAULT '[]';

-- ============================================
-- For MySQL (JSON type)
-- ============================================
-- ALTER TABLE tour_bookings ADD COLUMN price_details JSON DEFAULT NULL;
-- ALTER TABLE transfer_bookings ADD COLUMN price_details JSON DEFAULT NULL;

-- ============================================
-- price_details format:
-- [
--   { "cost": 1000, "sell": 1500, "type": "adt", "remark": "Adult" },
--   { "cost": 800, "sell": 1200, "type": "chd", "remark": "Child" }
-- ]
--
-- type values: "all" (total pax), "adt" (adult only), "chd" (child only)
-- ============================================
