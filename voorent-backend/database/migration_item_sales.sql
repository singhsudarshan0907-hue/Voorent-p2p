-- ============================================================
-- Migration: item_sales table (sold-item tracking)
-- Run once on the Supabase database (SQL Editor).
-- Safe to re-run — uses IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS item_sales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id     UUID NOT NULL REFERENCES listings(id),
    owner_id       UUID NOT NULL REFERENCES users(id),
    sale_type      VARCHAR(20)  NOT NULL DEFAULT 'voorent',   -- 'voorent' | 'external'
    sale_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    payout_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,          -- what Voorent pays the owner
    payment_method VARCHAR(20)  NOT NULL DEFAULT 'cash',      -- 'cash' | 'upi' | 'bank'
    payment_status VARCHAR(20)  NOT NULL DEFAULT 'pending',   -- 'pending' | 'paid'
    paid_at        TIMESTAMPTZ,
    buyer_name     VARCHAR(100),
    buyer_phone    VARCHAR(15),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_sales_listing ON item_sales(listing_id);
CREATE INDEX IF NOT EXISTS idx_item_sales_owner   ON item_sales(owner_id);
CREATE INDEX IF NOT EXISTS idx_item_sales_status  ON item_sales(payment_status);
