-- ─────────────────────────────────────────────────────────────────
-- Voorent — Sample seed data for local testing
-- Run AFTER schema.sql:
--   psql -U postgres -d voorent_dev -f seed.sql
-- ─────────────────────────────────────────────────────────────────

-- Clean slate (safe to re-run)
TRUNCATE listings, listing_images, users, otp_tokens, rentals, reviews, support_queries
  RESTART IDENTITY CASCADE;

-- ── Sample owner ─────────────────────────────────────────────────
INSERT INTO users (id, phone, name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '9999900000', 'Rahul Mehta', 'owner');

-- ── Sample customer ───────────────────────────────────────────────
INSERT INTO users (id, phone, name, role) VALUES
  ('22222222-2222-2222-2222-222222222222', '9999911111', 'Priya Singh', 'customer');

-- ── Furniture listings ────────────────────────────────────────────
INSERT INTO listings (id, owner_id, title, description, category, condition, item_price, is_rent_to_own, is_available, status) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Godrej Interio 3-Seater Sofa',
    'Barely used L-shape sofa in Like New condition. Perfect for a living room. Includes cushion covers.',
    'Furniture', 'Like New', 36000, true, true, 'active'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'King Size Wooden Bed Frame',
    'Solid teak wood king bed with storage drawers. No mattress included. Good condition.',
    'Furniture', 'Good', 28000, true, true, 'active'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Study Table with Chair Set',
    'Ergonomic study setup, 4ft table with storage shelves + adjustable chair. Acceptable condition.',
    'Furniture', 'Acceptable', 12000, false, true, 'active'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'IKEA KALLAX Shelf Unit (4x4)',
    'White IKEA shelf, 147x147cm. Minor scuffs on base. Great for books or display.',
    'Furniture', 'Good', 18000, true, true, 'active'
  );

-- ── Appliance listings ────────────────────────────────────────────
INSERT INTO listings (id, owner_id, title, description, category, condition, item_price, is_rent_to_own, is_available, status) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    'LG 260L Double Door Refrigerator',
    '2022 model, 4-star energy rating. Works perfectly. Comes with original shelves and ice tray.',
    'Appliances', 'Like New', 32000, true, true, 'active'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '11111111-1111-1111-1111-111111111111',
    'Samsung 7kg Front Load Washing Machine',
    'Fully automatic front-load, 2021 model. Drum clean done. Minor paint chip on top.',
    'Appliances', 'Good', 26000, true, true, 'active'
  ),
  (
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    '11111111-1111-1111-1111-111111111111',
    'Voltas 1.5 Ton 3-Star Split AC',
    'Includes indoor + outdoor unit. Serviced last month. Remote included. Works perfectly.',
    'Appliances', 'Good', 38000, true, true, 'active'
  ),
  (
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    '11111111-1111-1111-1111-111111111111',
    'Microwave Oven — LG 28L Convection',
    'Black finish, all modes working. Includes original accessories. Like new condition.',
    'Appliances', 'Like New', 14000, false, true, 'active'
  );

-- ── Listing images (using placeholder images) ─────────────────────
INSERT INTO listing_images (listing_id, url, sort_order) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600', 0),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600', 0),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600', 0),
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600', 0),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600', 0);

-- ── Sample active rental (for testing My Rentals screen) ──────────
INSERT INTO rentals (id, listing_id, customer_id, plan_type, monthly_amount, total_months, current_month, status, start_date) VALUES
  (
    'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'rent-to-own',
    3000,   -- 36000 / 12
    24,
    3,
    'ACTIVE',
    NOW() - INTERVAL '3 months'
  );

-- ── Sample reviews ────────────────────────────────────────────────
INSERT INTO reviews (listing_id, customer_id, rental_id, rating, review_text, is_visible) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
    5,
    'Sofa was in perfect condition, delivery was smooth. Voorent team was very helpful.',
    true
  );

SELECT 'Seed data loaded successfully ✅' AS status;
SELECT title, item_price, item_price/12 AS monthly_rent FROM listings ORDER BY category, title;
