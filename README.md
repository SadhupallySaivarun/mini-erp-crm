# Mini ERP + CRM Operations Portal

A full-stack internal operations portal for a wholesale/distribution company, covering
Customer CRM, Product & Inventory management, and a Sales Challan workflow with
role-based access control.

**Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT auth, React, Vite, Tailwind CSS.

---

## 1. Project Structure

```
mini-erp-crm/
├── client/                  # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI (Sidebar, Topbar, Modal, Pagination, etc.)
│   │   ├── pages/            # Route-level pages
│   │   ├── layouts/           # DashboardLayout (sidebar + topbar shell)
│   │   ├── hooks/              # useAuth
│   │   ├── services/            # Axios API clients per domain
│   │   ├── context/               # AuthContext
│   │   └── utils/                   # Formatters
│   └── Dockerfile
├── server/                  # Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma    # Data model
│   │   └── seed.ts          # Seeds test users + sample data
│   ├── src/
│   │   ├── config/          # env, Prisma client singleton
│   │   ├── controllers/     # Thin HTTP layer — calls services, formats responses
│   │   ├── services/         # Business logic (stock rules, challan lifecycle, etc.)
│   │   ├── repositories/       # Prisma queries only — no business logic
│   │   ├── middleware/          # auth, role guard, validation, error handler
│   │   ├── validators/            # Zod schemas per resource
│   │   ├── routes/                  # Express routers
│   │   ├── types/                     # Shared TS types, Express request augmentation
│   │   └── utils/                       # ApiError, ApiResponse, asyncHandler, challan numbering
│   └── Dockerfile
├── docker-compose.yml       # Local Postgres + server + client, one command
├── postman_collection.json  # Import into Postman to try every endpoint
└── README.md                 # You are here
```

### Architecture explanation

The backend follows a classic **layered architecture**:

`Route → Middleware (auth/role/validation) → Controller → Service → Repository → Prisma → PostgreSQL`

- **Repositories** only know how to talk to the database (Prisma queries). No business rules live here.
- **Services** hold all business logic — e.g. the sales challan service is the only place that
  knows "you can't confirm a non-draft challan" or "stock can never go negative."
- **Controllers** are thin: they call a service method and shape the HTTP response. No business logic.
- **Middleware** handles cross-cutting concerns: JWT verification, role-based access control, Zod
  request validation, and a single global error handler that understands both `ApiError` (our own
  thrown errors) and Prisma's known error codes (e.g. unique constraint violations → 409).

The frontend mirrors this separation: `services/` holds all Axios calls (no HTTP logic in components),
`context/AuthContext` centralizes auth state, and pages are composed from small reusable components.

---

## 2. Core Business Logic (Sales Challan)

This is the most business-rule-heavy part of the system, so it's worth calling out explicitly:

- **Challan numbers** are auto-generated in the format `CH-YYYYMMDD-0001`, incrementing per day.
- Every challan item stores a **product snapshot** (name, SKU, unit price) at the time it was added —
  so historical challans stay accurate even if you rename a product or change its price later.
- A challan can be created directly as `CONFIRMED`, or saved as `DRAFT` and confirmed later.
- **Stock can never go negative.** Both at creation-time (if confirming immediately) and at
  confirm-time (for drafts), every line item's quantity is checked against current stock. If any
  single item is short, the *entire* operation is rejected with a clear 400 error — no partial
  deductions.
- Confirming a challan **deducts stock and writes a `StockMovement` (OUT)** log per line item, all
  inside a single Prisma transaction (`prisma.$transaction`), so a failure partway through can't leave
  inventory in an inconsistent state.
- **Cancelling a confirmed challan restores the stock** (writes `StockMovement` IN entries reversing
  the deduction). Only `DRAFT` challans are editable; confirmed/cancelled challans are immutable
  history.

---

## 3. Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use the provided Docker Compose setup, or a free hosted Postgres like Neon)

### Option A — Docker Compose (fastest)

```bash
docker compose up --build
```

This starts Postgres, syncs the schema with `prisma db push` and seeds test data, and serves the
API on `:5000` and the frontend on `:5173`. Skip to step "Test Login Credentials" below once it's up.

> **Note:** this repo doesn't ship pre-generated Prisma migration files, so the Docker path uses
> `prisma db push` (syncs schema directly, no migration history) rather than `prisma migrate deploy`.
> For a real production deployment, generate proper migrations once via `npx prisma migrate dev
> --name init` locally (see Option B below), commit the resulting `prisma/migrations/` folder, and
> then `prisma migrate deploy` will work too.

### Option B — Manual setup

**1. Backend**

```bash
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres connection string, and set a real JWT_SECRET

npm install
npx prisma migrate dev --name init   # creates tables
npm run seed                          # creates test users + sample data
npm run dev                           # starts on http://localhost:5000
```

**2. Frontend**

```bash
cd client
cp .env.example .env
# VITE_API_URL should point at your backend, e.g. http://localhost:5000/api/v1

npm install
npm run dev   # starts on http://localhost:5173
```

### Test Login Credentials

All seeded users share the password `Password@123`:

| Role      | Email                    |
|-----------|---------------------------|
| Admin     | admin@erpcrm.test         |
| Sales     | sales@erpcrm.test         |
| Warehouse | warehouse@erpcrm.test     |
| Accounts  | accounts@erpcrm.test      |

---

## 4. Environment Variables

**Backend (`server/.env`)**

| Variable         | Description                                      |
|------------------|---------------------------------------------------|
| `PORT`           | Port the API listens on (default 5000)             |
| `NODE_ENV`       | `development` or `production`                       |
| `DATABASE_URL`   | PostgreSQL connection string (Prisma format)          |
| `JWT_SECRET`     | Secret used to sign JWTs — use a long random string     |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d`                                 |
| `CLIENT_ORIGIN`  | Frontend URL, used for CORS                                 |

**Frontend (`client/.env`)**

| Variable       | Description                          |
|----------------|----------------------------------------|
| `VITE_API_URL` | Base URL of the backend API (`/api/v1`) |

---

## 5. API Overview

All routes are prefixed with `/api/v1`. Full request/response examples are in
`postman_collection.json` — import it into Postman and set `baseUrl`; the login request
auto-populates the `token` variable for you.

| Method | Route                                  | Description                          | Roles |
|--------|-----------------------------------------|----------------------------------------|-------|
| POST   | `/auth/login`                            | Login, returns JWT                      | Public |
| GET    | `/auth/me`                                | Current user profile                     | Any authenticated |
| GET/POST/PUT/DELETE | `/customers`, `/customers/:id`  | Customer CRUD                             | Admin, Sales (view: + Accounts) |
| POST   | `/customers/:id/follow-up-notes`           | Add a follow-up note                       | Admin, Sales |
| GET/POST/PUT/DELETE | `/products`, `/products/:id`      | Product CRUD                                | Admin, Warehouse (view: all roles) |
| GET    | `/products/low-stock`                        | Products at/under their alert threshold       | All roles |
| GET    | `/inventory/movements/:productId`               | Stock movement history for a product           | Admin, Warehouse, Accounts |
| POST   | `/inventory/movements`                            | Record a manual IN/OUT stock movement            | Admin, Warehouse |
| GET/POST/PUT | `/challans`, `/challans/:id`                 | Sales challan CRUD (create/edit drafts)            | Admin, Sales (view: all roles) |
| PATCH  | `/challans/:id/confirm`                                | Confirm a draft challan (deducts stock)              | Admin, Sales, Warehouse |
| PATCH  | `/challans/:id/cancel`                                   | Cancel a challan (restores stock if it was confirmed)   | Admin, Sales |
| GET    | `/health`                                                    | Health check                                                | Public |

All list endpoints support `page`, `limit`, and relevant `search`/`status`/`category` filters.
All error responses follow `{ success: false, message, errors? }`. All success responses follow
`{ success: true, message, data, meta? }`.

---

## 6. Deployment Guide

The recommended free-tier stack:

- **Database:** [Neon](https://neon.tech) (serverless Postgres, free tier)
- **Backend:** [Render](https://render.com) (Web Service, free tier)
- **Frontend:** [Vercel](https://vercel.com) (free tier)

### Step 1 — Database (Neon)
1. Create a Neon project, copy the connection string (it looks like
   `postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require`).

### Step 2 — Backend (Render)
1. Push this repo to GitHub.
2. In Render, create a **New Web Service**, point it at the `server/` directory (root directory:
   `server`).
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma migrate deploy && npm run seed && npm start`
   (drop `&& npm run seed` after the first successful deploy so you don't reseed on every restart)
5. Add environment variables from `server/.env.example`, using your Neon `DATABASE_URL`, a real
   `JWT_SECRET`, and `CLIENT_ORIGIN` set to your future Vercel URL.
6. Deploy. Note the resulting URL, e.g. `https://mini-erp-crm-api.onrender.com`.

### Step 3 — Frontend (Vercel)
1. In Vercel, import the same repo, set root directory to `client`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Add environment variable `VITE_API_URL=https://mini-erp-crm-api.onrender.com/api/v1`.
4. Deploy. Note the resulting URL, e.g. `https://mini-erp-crm.vercel.app`.
5. Go back to Render and update `CLIENT_ORIGIN` to this Vercel URL (for CORS), then redeploy the
   backend.

### Local-only alternative
If you don't want to deploy, run everything locally with `docker compose up --build`, then record a
short screen capture walking through: login as each role → create a customer → add a product →
create a draft challan → confirm it (watch stock deduct) → cancel a confirmed challan (watch stock
restore).

---

## 7. Known Limitations / Assumptions

- Purchase orders and invoicing (mentioned in the business context, not in the required modules) are
  out of scope — only Customer CRM, Product/Inventory, and Sales Challans are implemented, per the
  "Core Modules Required" section of the spec.
- PDF invoice export, S3 image upload, and GitHub Actions CI are bonus items and are not included in
  this submission to keep scope tight and every included feature fully working.
- Low-stock filtering compares `currentStock` to `minStockAlert` in application code rather than a
  raw SQL column comparison, for clarity — fine at this data scale, but would move to a raw query or
  a computed column for very large catalogs.
- The seed script uses a fixed UUID for the demo customer so it's `upsert`-safe on repeated seeding.

---

## 8. Bonus Features Included

- ✅ Docker setup (`docker-compose.yml` + Dockerfiles for both apps, nginx-served frontend)
- ✅ Postman collection with test-scripts that auto-chain IDs between requests
- ⬜ PDF invoice export, S3 image upload, GitHub Actions — not included (see Limitations)
