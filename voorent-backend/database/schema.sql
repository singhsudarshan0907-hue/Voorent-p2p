-- ============================================================
-- VOORENT PostgreSQL Schema  (apply once on a fresh database)
-- psql -h localhost -p 5433 -U bholi -d voorent_dev -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (both owners and customers — role decides which)
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         VARCHAR(15) UNIQUE NOT NULL,
    name          VARCHAR(100),
    role          VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' | 'owner' | 'both'
    pan_number    VARCHAR(10),
    aadhaar_ref   VARCHAR(50),  -- DigiLocker reference only, never raw Aadhaar
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) NOT NULL,
    code        VARCHAR(6) NOT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings
CREATE TABLE IF NOT EXISTS listings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL REFERENCES users(id),
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    category       VARCHAR(50) NOT NULL,            -- 'Furniture' | 'Appliances'
    condition      VARCHAR(20) NOT NULL,            -- 'Like New' | 'Good' | 'Acceptable'
    item_price     NUMERIC(10,2) NOT NULL,
    is_rent_to_own BOOLEAN NOT NULL DEFAULT TRUE,
    pricing_type   VARCHAR(20) NOT NULL DEFAULT 'consignment', -- 'consignment' | 'buyout'
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',     -- 'pending' | 'active' | 'rented' | 'sold' | 'rejected'
    is_available   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listing images
CREATE TABLE IF NOT EXISTS listing_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

-- Rentals
CREATE TABLE IF NOT EXISTS rentals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id     UUID NOT NULL REFERENCES listings(id),
    customer_id    UUID NOT NULL REFERENCES users(id),
    plan_type      VARCHAR(20) NOT NULL,  -- 'monthly' | 'upfront'
    total_months   INT NOT NULL DEFAULT 12,
    current_month  INT NOT NULL DEFAULT 1,
    monthly_amount NUMERIC(10,2) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'upcoming', -- 'upcoming' | 'active' | 'completed' | 'overdue'
    start_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date       DATE,
    next_payment   DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (Razorpay orders)
CREATE TABLE IF NOT EXISTS payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_order_id    VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id  VARCHAR(100),
    listing_id           UUID NOT NULL REFERENCES listings(id),
    customer_id          UUID NOT NULL REFERENCES users(id),
    rental_id            UUID REFERENCES rentals(id),
    amount_paise         INT NOT NULL,         -- amount in paise (₹1 = 100 paise)
    plan                 VARCHAR(20) NOT NULL, -- 'monthly' | 'upfront'
    status               VARCHAR(20) NOT NULL DEFAULT 'created', -- 'created' | 'paid' | 'failed'
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payouts to owners
CREATE TABLE IF NOT EXISTS payouts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id),
    rental_id   UUID REFERENCES rentals(id),
    amount      NUMERIC(10,2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID NOT NULL REFERENCES listings(id),
    customer_id  UUID NOT NULL REFERENCES users(id),
    rental_id    UUID NOT NULL REFERENCES rentals(id),
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text  VARCHAR(500),
    is_visible   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, customer_id)
);

-- Support queries (Contact Voorent)
CREATE TABLE IF NOT EXISTS support_queries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    context     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open' | 'resolved'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_category  ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status    ON listings(status);
CREATE INDEX IF NOT EXISTS idx_rentals_customer   ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_listing    ON rentals(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing    ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires  ON otp_tokens(phone, expires_at);
