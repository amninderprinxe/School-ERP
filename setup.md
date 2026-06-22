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
🌱  Seeding database…
✅  Super Admin    → superadmin@erp.com

✅  School         → Greenwood High School  (slug: greenwood-high)

✅  School Admin   → admin@greenwood.edu

✅  Class          → Grade 10

✅  Teacher        → teacher@greenwood.edu  (TCH-001)

✅  Section        → Grade 10 — Section A

✅  Subject        → Mathematics assigned to Ravi Sharma

✅  Student        → student@greenwood.edu  (Roll: 10A-001)

✅  Parent         → parent@greenwood.edu  linked to Aarav Mehta

✅  Announcement   → Welcome notice created
──────────────────────────────────────────────────────────────

SEED COMPLETE — Demo Login Credentials

──────────────────────────────────────────────────────────────

Role          Email                        Password

──────────────────────────────────────────────────────────────

SUPER_ADMIN   superadmin@erp.com           Password@123

SCHOOL_ADMIN  admin@greenwood.edu          Password@123

TEACHER       teacher@greenwood.edu        Password@123

STUDENT       student@greenwood.edu        Password@123

PARENT        parent@greenwood.edu         Password@123

---

## 6. Start the Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — you will be redirected to `/login` automatically.

---

## 7. Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@erp.com` | `Password@123` |
| School Admin | `admin@greenwood.edu` | `Password@123` |
| Teacher | `teacher@greenwood.edu` | `Password@123` |
| Student | `student@greenwood.edu` | `Password@123` |
| Parent | `parent@greenwood.edu` | `Password@123` |

> All new users created via the School Admin CRUD pages also get `Password@123` as their default password.

---

## 8. Route Reference

### Public Routes

| Route | Description |
|---|---|
| `GET /login` | Login page (all roles) |
| `GET /unauthorized` | Access-denied page |

---

### Super Admin Routes

> Accessible only by `SUPER_ADMIN`.

| Route | Description |
|---|---|
| `GET /super-admin` | Global dashboard — school + user stats |
| `GET /super-admin/schools` | *(Phase 2)* List / manage all schools |
| `GET /super-admin/users` | *(Phase 2)* List all users across schools |
| `GET /super-admin/settings` | *(Phase 2)* Platform settings |

---

### School Admin Routes

> Accessible only by `SCHOOL_ADMIN`. Every query is scoped to `session.user.schoolId`.

#### Dashboard
| Route | Description |
|---|---|
| `GET /school-admin` | School dashboard — counts + announcements |

#### Students
| Route | Method | Description |
|---|---|---|
| `/school-admin/students` | `GET` | List all students with section, roll no., admission no. |
| `/school-admin/students/new` | `GET` | Render create-student form |
| `/school-admin/students/new` | `POST` (Server Action) | Create student + profile |
| `/school-admin/students/[id]/edit` | `GET` | Render edit-student form |
| `/school-admin/students/[id]/edit` | `POST` (Server Action) | Update student + profile |
| *(inline)* | Server Action `deleteStudent` | Delete student + cascade profile |

#### Teachers
| Route | Method | Description |
|---|---|---|
| `/school-admin/teachers` | `GET` | List all teachers with emp. code, qualification |
| `/school-admin/teachers/new` | `GET` | Render create-teacher form |
| `/school-admin/teachers/new` | `POST` (Server Action) | Create teacher + profile |
| `/school-admin/teachers/[id]/edit` | `GET` | Render edit-teacher form |
| `/school-admin/teachers/[id]/edit` | `POST` (Server Action) | Update teacher + profile |
| *(inline)* | Server Action `deleteTeacher` | Delete teacher + cascade profile |

#### Classes
| Route | Method | Description |
|---|---|---|
| `/school-admin/classes` | `GET` | List all classes with section + subject counts |
| `/school-admin/classes/new` | `GET` | Render create-class form |
| `/school-admin/classes/new` | `POST` (Server Action) | Create class |
| `/school-admin/classes/[id]/edit` | `GET` | Render edit-class form |
| `/school-admin/classes/[id]/edit` | `POST` (Server Action) | Update class name |
| *(inline)* | Server Action `deleteClass` | Delete class + cascade sections + subjects |

#### Sections
| Route | Method | Description |
|---|---|---|
| `/school-admin/sections` | `GET` | List all sections with class + teacher + student count |
| `/school-admin/sections/new` | `GET` | Render create-section form |
| `/school-admin/sections/new` | `POST` (Server Action) | Create section (linked to class, optional teacher) |
| `/school-admin/sections/[id]/edit` | `GET` | Render edit-section form |
| `/school-admin/sections/[id]/edit` | `POST` (Server Action) | Update section |
| *(inline)* | Server Action `deleteSection` | Delete section (students' sectionId nulled by DB) |

---

### Teacher Routes

> Accessible only by `TEACHER`.

| Route | Description |
|---|---|
| `GET /teacher` | Dashboard — assigned subjects, sections, announcements |
| `GET /teacher/classes` | *(Phase 2)* |
| `GET /teacher/subjects` | *(Phase 2)* |
| `GET /teacher/students` | *(Phase 2)* |

---

### Student Routes

> Accessible only by `STUDENT`.

| Route | Description |
|---|---|
| `GET /student` | Dashboard — class, subjects, class teacher info, announcements |
| `GET /student/subjects` | *(Phase 2)* |
| `GET /student/attendance` | *(Phase 2)* |
| `GET /student/results` | *(Phase 2)* |

---

### Parent Routes

> Accessible only by `PARENT`.

| Route | Description |
|---|---|
| `GET /parent` | Dashboard — children cards, announcements |
| `GET /parent/children` | *(Phase 2)* |
| `GET /parent/attendance` | *(Phase 2)* |
| `GET /parent/results` | *(Phase 2)* |

---

### NextAuth API Routes (internal — do not call directly)

| Route | Description |
|---|---|
| `POST /api/auth/callback/credentials` | Credentials sign-in handler |
| `GET  /api/auth/session` | Returns current session JSON |
| `POST /api/auth/signout` | Signs the user out |

---

## 9. Key File Reference
school-erp/

├── prisma/

│   ├── schema.prisma          # Full multi-tenant schema (all 5 roles)

│   └── seed.ts                # Idempotent demo data seed

│

├── src/

│   ├── app/

│   │   ├── (auth)/

│   │   │   └── login/page.tsx             # Login page

│   │   ├── (dashboard)/

│   │   │   ├── layout.tsx                 # Shared dashboard shell

│   │   │   ├── super-admin/page.tsx       # Super Admin dashboard

│   │   │   ├── school-admin/

│   │   │   │   ├── page.tsx               # School Admin dashboard

│   │   │   │   ├── students/              # Student CRUD

│   │   │   │   ├── teachers/              # Teacher CRUD

│   │   │   │   ├── classes/               # Class CRUD

│   │   │   │   └── sections/              # Section CRUD

│   │   │   ├── teacher/page.tsx           # Teacher dashboard

│   │   │   ├── student/page.tsx           # Student dashboard

│   │   │   └── parent/page.tsx            # Parent dashboard

│   │   ├── api/auth/[...nextauth]/

│   │   │   └── route.ts                   # NextAuth handlers

│   │   ├── unauthorized/page.tsx

│   │   └── page.tsx                       # Root → redirects by role

│   │

│   ├── actions/

│   │   ├── student.actions.ts             # create / update / delete

│   │   ├── teacher.actions.ts

│   │   ├── class.actions.ts

│   │   └── section.actions.ts

│   │

│   ├── components/

│   │   ├── auth/logout-button.tsx

│   │   ├── dashboard/stat-card.tsx

│   │   ├── layout/

│   │   │   ├── dashboard-shell.tsx        # Mobile-aware layout wrapper

│   │   │   ├── sidebar.tsx                # Role-based nav sidebar

│   │   │   └── topbar.tsx                 # Top bar + logout

│   │   ├── school-admin/

│   │   │   ├── student-form.tsx

│   │   │   ├── teacher-form.tsx

│   │   │   ├── class-form.tsx

│   │   │   └── section-form.tsx

│   │   ├── ui/

│   │   │   ├── submit-button.tsx

│   │   │   └── row-actions.tsx

│   │   └── providers.tsx                  # SessionProvider wrapper

│   │

│   ├── config/

│   │   └── nav.ts                         # Role → nav items map

│   │

│   ├── lib/

│   │   ├── auth.ts                        # NextAuth config

│   │   ├── db.ts                          # Prisma singleton

│   │   ├── session.ts                     # requireRole / getCurrentUser

│   │   └── utils.ts                       # cn / formatRoleLabel / getDashboardPath

│   │

│   ├── middleware.ts                       # Route protection + role redirect

│   │

│   └── types/

│       ├── actions.ts                     # ActionResult<T> type

│       └── next-auth.d.ts                 # Session type augmentation

│

├── .env.example

├── .env.local                             # Your real secrets (git-ignored)

├── next.config.ts

├── tailwind.config.ts

└── SETUP.md                               # This file

---

## 10. Middleware Route Protection

The middleware in `src/middleware.ts` enforces these rules on every request:

| Condition | Action |
|---|---|
| Unauthenticated → any protected route | Redirect to `/login` |
| Authenticated → `/login` | Redirect to role dashboard |
| `TEACHER` → `/school-admin/*` | Redirect to `/teacher` |
| `STUDENT` → `/teacher/*` | Redirect to `/student` |
| Any role → wrong role's prefix | Redirect to their own dashboard |
| All `/api/auth/*` routes | Skipped (NextAuth handles these) |

---

## 11. Security Checklist

- [x] Passwords hashed with `bcrypt` (10 rounds)
- [x] JWT stored in an HTTP-only cookie (NextAuth default)
- [x] Every Prisma query in School Admin actions filters by `schoolId`
- [x] `requireRole([...])` called at the top of every protected server action
- [x] Bound server actions (`updateStudent.bind(null, id)`) prevent ID spoofing
- [x] `notFound()` returned when an entity's `schoolId` doesn't match the session
- [x] Middleware blocks cross-role route access before any DB query runs

---

## 12. Common Commands

```bash
# Start dev server
npm run dev

# Re-run seed (safe — all upserts)
npx prisma db seed

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Reset DB and re-seed from scratch
npx prisma migrate reset

# Push schema changes without a migration file
npx prisma db push

# Regenerate Prisma client after schema change
npx prisma generate

# Type-check the whole project
npx tsc --noEmit

# Build for production
npm run build
npm start
```

---

## 13. Troubleshooting

### `Error: @prisma/client did not initialize yet`
```bash
npx prisma generate
```

### `PrismaClientInitializationError: Can't reach database server`
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env.local` has the correct user, password, host, and DB name.

### `Error: NEXTAUTH_SECRET is not set`
- Make sure `.env.local` (not `.env`) contains `NEXTAUTH_SECRET`.
- Restart the dev server after editing `.env.local`.

### Login redirects back to `/login` with no error
- Confirm the seed ran successfully (`npx prisma db seed`).
- Check the email/password match what the seed printed.
- Run `npx prisma studio` → open the `users` table → confirm `isActive = true`.

### `Module not found: Can't resolve 'bcryptjs'`
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### Tailwind classes not applying
```bash
# Confirm tailwind.config.ts content array includes src/**
# Then restart the dev server
npm run dev
```

### `params should be awaited` warning in Next.js 15
All dynamic route pages already use `const { id } = await params` — this is correct for Next.js 15.

---

## 14. Phase 1 Completion Status

| Feature | Status |
|---|---|
| Project scaffold (Next.js 15 + TS + Tailwind) | ✅ Done |
| Prisma schema — multi-tenant with `schoolId` | ✅ Done |
| All 5 roles: SUPER_ADMIN / SCHOOL_ADMIN / TEACHER / STUDENT / PARENT | ✅ Done |
| NextAuth credentials login + JWT with role + schoolId | ✅ Done |
| Middleware route protection + role-based redirect | ✅ Done |
| Responsive dashboard layout (sidebar + topbar) | ✅ Done |
| Role-specific dashboards with live DB stats | ✅ Done |
| School Admin — Students CRUD | ✅ Done |
| School Admin — Teachers CRUD | ✅ Done |
| School Admin — Classes CRUD | ✅ Done |
| School Admin — Sections CRUD (with class + teacher link) | ✅ Done |
| Zod validation on all forms | ✅ Done |
| schoolId isolation on every query | ✅ Done |
| Idempotent seed with demo data | ✅ Done |
| Payments / Razorpay | ⏳ Phase 2 |
| Attendance module | ⏳ Phase 2 |
| Results / Grades module | ⏳ Phase 2 |
| Fees module | ⏳ Phase 2 |
| Subjects CRUD | ⏳ Phase 2 |
| Announcements CRUD | ⏳ Phase 2 |
| Super Admin school management | ⏳ Phase 2 |
| Password change / profile settings | ⏳ Phase 2 |
