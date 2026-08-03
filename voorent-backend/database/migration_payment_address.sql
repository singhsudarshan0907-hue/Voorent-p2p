-- ============================================================
-- Migration: delivery address on orders
-- Run once on the Supabase database (SQL Editor). Safe to re-run.
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS delivery_address TEXT;
