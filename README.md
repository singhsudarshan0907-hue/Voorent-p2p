# Voorent P2P — Developer Setup

Rent-to-own furniture & appliances marketplace. React 18 frontend + ASP.NET Core 8 backend + PostgreSQL 16.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| .NET SDK | 8.0 | https://dotnet.microsoft.com/download |
| PostgreSQL | 16 | https://www.postgresql.org/download |

---

## 1 — Database

```bash
# Create the databases
psql -U postgres -c "CREATE DATABASE voorent;"
psql -U postgres -c "CREATE DATABASE voorent_dev;"

# Run the schema
psql -U postgres -d voorent_dev -f voorent-backend/database/schema.sql
```

---

## 2 — Backend (ASP.NET Core)

```bash
cd voorent-backend/VoorentApi
```

Edit `appsettings.Development.json` and set your Postgres password:

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=voorent_dev;Username=postgres;Password=YOUR_PASSWORD"
  },
  "Jwt": {
    "Key": "replace-with-a-random-32-char-secret",
    "Issuer": "voorent"
  }
}
```

Then run:

```bash
dotnet restore
dotnet run
```

API is available at **http://localhost:5000** (Swagger UI at `/swagger`).

---

## 3 — Frontend (React + Vite)

```bash
cd voorent-frontend
```

Copy the env file and confirm the API URL:

```bash
cp .env.example .env
# .env already contains: VITE_API_URL=http://localhost:5000/api
```

Install and start:

```bash
npm install
npm run dev
```

App opens at **http://localhost:5173**.

---

## Folder Structure

```
p2p website voorent/
├── voorent-frontend/          # React 18 + TypeScript + Tailwind (Vite)
│   ├── src/
│   │   ├── components/        # BottomNav, StarRating
│   │   ├── pages/             # Home, Browse, ProductDetails, ConfirmRental,
│   │   │                      #   Login, MyRentals, OwnerDashboard, ListAnItem
│   │   ├── services/api.ts    # Axios client + all API calls
│   │   └── types/index.ts     # TypeScript interfaces
│   └── .env                   # VITE_API_URL (not committed)
│
├── voorent-backend/
│   ├── database/schema.sql    # PostgreSQL schema (run once)
│   └── VoorentApi/            # ASP.NET Core 8 Web API
│       ├── Controllers/       # Auth, Listings, Rentals, Reviews,
│       │                      #   Support, Payouts
│       ├── Models/AppModels.cs
│       ├── Data/AppDbContext.cs
│       └── appsettings.Development.json   # local config (not committed)
│
└── Voorent_Design_Handoff.docx  # UI/UX spec (Stitch, 12 screens)
```

---

## Key Routes

| Path | Screen |
|------|--------|
| `/` | Home |
| `/browse` | Browse (Furniture / Appliances) |
| `/item/:id` | Product Details + Reviews |
| `/checkout/:listingId` | Confirm Rental |
| `/login` | OTP Login |
| `/my-rentals` | Customer Rental Tracker |
| `/dashboard/owner` | Owner Dashboard + Payouts |
| `/list` | List an Item (4-step wizard) |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/send-otp` | — | Send 6-digit OTP to phone |
| POST | `/api/auth/verify-otp` | — | Verify OTP → JWT |
| GET | `/api/listings` | — | All listings (optional `?category=`) |
| GET | `/api/listings/:id` | — | Single listing |
| GET | `/api/listings/owner` | ✅ | Owner's own listings |
| POST | `/api/listings` | ✅ | Create listing |
| GET | `/api/rentals/customer` | ✅ | Customer's rentals |
| POST | `/api/rentals` | ✅ | Start a rental |
| GET | `/api/reviews/:listingId` | — | Public reviews |
| POST | `/api/reviews` | ✅ | Submit review (requires completed rental) |
| POST | `/api/support/contact` | ✅ | Contact Voorent |
| GET | `/api/payouts` | ✅ | Owner payout history |

---

## Business Rules

- **Monthly rent** = item price ÷ 12
- **Rent-to-Own** = 24 months × monthly rate (2× item price total)
- **Security deposit** = ₹0
- **Consignment** = owner earns 50% of rental revenue
- **Buyout** = owner receives 60% upfront on full-price sale
- **Contact** = customers contact Voorent only (no direct owner contact)
- **Reviews** = only visible; reviewer shown as "First L." format
- **OTP auth** = 6-digit SMS code, 30-second resend, max 5 attempts

---

## Design

12-screen Stitch design → `Voorent_Design_Handoff.docx`

Brand tokens: Primary `#2D6A4F` · Secondary `#F4A261` · Font: Inter · Mobile-first 430px

---

## Next Steps (Pipeline)

1. ✅ Blueprint (Claude)
2. ✅ UI Design (Stitch — 12 screens)
3. ✅ Code scaffold (React + .NET + PostgreSQL)
4. ⬜ ADK + Claude AI helpers
5. ⬜ Google Cloud deployment
