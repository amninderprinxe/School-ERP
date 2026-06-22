# School ERP — Phase 1 Setup Guide

Complete instructions to go from zero to a running multi-tenant School ERP
with authentication, role-based dashboards, and School Admin CRUD.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 18.17+ | `node -v` |
| npm | 9+ | `npm -v` |
| PostgreSQL | 14+ | `psql --version` |
| Git | any | `git --version` |

> **macOS / Linux**: install PostgreSQL via [Homebrew](https://brew.sh) (`brew install postgresql@16`) or the [official installer](https://www.postgresql.org/download/).
> **Windows**: use the [PostgreSQL Windows installer](https://www.postgresql.org/download/windows/) or WSL2 + Ubuntu.

---

## 1. Create the Project

```bash
npx create-next-app@latest school-erp \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd school-erp
```

---

## 2. Install All Dependencies

Run these commands from the project root:

```bash
# ── ORM & Database ───────────────────────────────────────────
npm install prisma @prisma/client

# ── Authentication ───────────────────────────────────────────
npm install next-auth@beta

# ── Password hashing ─────────────────────────────────────────
npm install bcryptjs
npm install -D @types/bcryptjs

# ── Validation ───────────────────────────────────────────────
npm install zod

# ── UI utilities ─────────────────────────────────────────────
npm install clsx tailwind-merge lucide-react

# ── TypeScript runner (for seed script) ──────────────────────
npm install -D tsx

# ── Initialise Prisma ────────────────────────────────────────
npx prisma init --datasource-provider postgresql
```

---

## 3. Create the PostgreSQL Database

```bash
# Option A — psql CLI
psql -U postgres -c "CREATE DATABASE school_erp;"

# Option B — createdb helper
createdb school_erp

# Option C — inside psql shell
psql -U postgres
postgres=# CREATE DATABASE school_erp;
postgres=# \q
```

If your PostgreSQL user is not `postgres`, replace it with your local username:

```bash
psql -U YOUR_USERNAME -c "CREATE DATABASE school_erp;"
```

---

## 4. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

**File: `.env.local`**
```env
# ── Database ──────────────────────────────────────────────────────────────
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_erp?schema=public"

# ── NextAuth ──────────────────────────────────────────────────────────────
# Generate a secret:  openssl rand -base64 32
NEXTAUTH_SECRET="replace-this-with-a-real-random-string-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# ── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="School ERP"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Generate a secure secret (recommended):**
> ```bash
> openssl rand -base64 32
> # copy the output into NEXTAUTH_SECRET
> ```

---

## 5. Set Up the Database

```bash
# Push the Prisma schema to PostgreSQL (creates all tables)
npx prisma db push

# Generate the Prisma TypeScript client
npx prisma generate

# Seed demo data (idempotent — safe to run multiple times)
npx prisma db seed
```

Expected seed output:
