# SchoolAxis - School ERP SaaS Platform

SchoolAxis is a multi-school ERP SaaS platform built to help schools manage students, teachers, classes, sections, announcements, and role-based dashboards from one secure system.

This project is currently in Phase 1 and focuses on authentication, role-based access, dashboard layout, and school admin CRUD modules.

---

## Features

### Authentication & Role-Based Access

- Secure login system using NextAuth/Auth.js
- Credentials-based authentication
- Password hashing using bcryptjs
- JWT-based session handling
- Protected dashboard routes
- Automatic dashboard redirection based on user role

### User Roles

- Super Admin
- School Admin
- Teacher
- Student
- Parent

### School Admin Module

- Add, view, edit, and delete students
- Add, view, edit, and delete teachers
- Add, view, edit, and delete classes
- Add, view, edit, and delete sections
- Assign students to sections
- Assign class teachers to sections
- School-level data isolation using `schoolId`

### Dashboard System

- Separate dashboards for each role
- Responsive sidebar navigation
- Topbar with user information
- Clean UI built with Tailwind CSS
- Role-based navigation links

---

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth/Auth.js
- bcryptjs
- Zod
- Lucide React Icons

---

## Getting Started

Follow these steps to run this project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/schoolaxis.git
cd schoolaxis
```

Replace `your-username` with your actual GitHub username.

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Setup Environment Variables

Create a `.env` file in the root directory of the project.

Add the following variables:

```env
DATABASE_URL="your_postgresql_database_url"
AUTH_SECRET="your_auth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

Example local PostgreSQL database URL:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/schoolaxis"
```

Generate an authentication secret:

```bash
npx auth secret
```

Or manually create a strong secret and add it to:

```env
AUTH_SECRET="your_generated_secret"
```

---

### 4. Setup Prisma

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migration:

```bash
npx prisma migrate dev
```

Seed the database with demo users and sample data:

```bash
npx prisma db seed
```

Optional: open Prisma Studio to view database records:

```bash
npx prisma studio
```

---

### 5. Run the Development Server

```bash
npm run dev
```

Open the project in your browser:

```bash
http://localhost:3000
```

---

## Demo Accounts

Default password for all demo users:

```bash
Password@123
```

| Role | Email |
|---|---|
| Super Admin | superadmin@erp.com |
| School Admin | admin@greenwood.edu |
| Teacher | teacher@greenwood.edu |
| Student | student@greenwood.edu |
| Parent | parent@greenwood.edu |

---

## Project Structure

```bash
src/
├── actions/
│   ├── student.actions.ts
│   ├── teacher.actions.ts
│   ├── class.actions.ts
│   └── section.actions.ts
│
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   │
│   ├── unauthorized/
│   │   └── page.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx
│   │
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── super-admin/
│       │   └── page.tsx
│       ├── school-admin/
│       │   ├── page.tsx
│       │   ├── students/
│       │   ├── teachers/
│       │   ├── classes/
│       │   └── sections/
│       ├── teacher/
│       │   └── page.tsx
│       ├── student/
│       │   └── page.tsx
│       └── parent/
│           └── page.tsx
│
├── components/
│   ├── auth/
│   │   └── logout-button.tsx
│   │
│   ├── dashboard/
│   │   └── stat-card.tsx
│   │
│   ├── layout/
│   │   ├── dashboard-shell.tsx
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   │
│   ├── school-admin/
│   │   ├── student-form.tsx
│   │   ├── teacher-form.tsx
│   │   ├── class-form.tsx
│   │   └── section-form.tsx
│   │
│   └── ui/
│       ├── row-actions.tsx
│       └── submit-button.tsx
│
├── config/
│   └── nav.ts
│
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── session.ts
│   ├── utils.ts
│   └── validations/
│       ├── student.ts
│       ├── teacher.ts
│       ├── class.ts
│       └── section.ts
│
├── types/
│   ├── actions.ts
│   └── next-auth.d.ts
│
└── middleware.ts
```

---

## Role-Based Access

### Super Admin

The Super Admin can manage the platform at a global level.

Current access:

- Super Admin dashboard
- Total schools count
- Total users count
- Active schools count
- Student, teacher, and school admin counts

### School Admin

The School Admin can manage only their own school data.

Current access:

- School Admin dashboard
- Students management
- Teachers management
- Classes management
- Sections management

### Teacher

The Teacher can access their assigned information.

Current access:

- Teacher dashboard
- Assigned classes
- Assigned subjects
- School announcements

### Student

The Student can access their academic information.

Current access:

- Student dashboard
- Assigned class and section
- Subjects
- School announcements

### Parent

The Parent can access child-related information.

Current access:

- Parent dashboard
- Linked children
- Child class and section information
- School announcements

---

## Security

This project follows multi-school SaaS security principles.

- Every school-specific record is linked with `schoolId`
- School Admin can access only their own school data
- Students are filtered by the logged-in School Admin's school
- Teachers are filtered by the logged-in School Admin's school
- Classes and sections are filtered by school
- Server Actions verify user role before performing CRUD operations
- Protected routes are handled through middleware
- Users cannot access dashboards outside their role
- Passwords are stored using bcrypt hashing

---

## Current Completed Modules

### Phase 1 Completed

- Next.js project setup
- Prisma setup
- PostgreSQL database connection
- Authentication system
- Login page
- Role-based route protection
- Role-based dashboards
- Dashboard sidebar and topbar
- Super Admin dashboard
- School Admin dashboard
- Teacher dashboard
- Student dashboard
- Parent dashboard
- School Admin Students CRUD
- School Admin Teachers CRUD
- School Admin Classes CRUD
- School Admin Sections CRUD

---

## Upcoming Modules

Planned features:

- Subjects management
- Announcements management
- Attendance module
- Results module
- Fees module
- Admission enquiry module
- Public school pages
- Student portal improvements
- Parent portal improvements
- Teacher class management
- Reports and analytics
- Notifications
- Online payment integration in future phase

---

## Useful Commands

Run development server:

```bash
npm run dev
```

Build project:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run Prisma migration:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

Seed database:

```bash
npx prisma db seed
```

---

## Important Notes

This project is currently under development.

Payment features such as Razorpay are not added yet.

Attendance, results, fees, and payment modules are planned for future phases.

The main focus of the current phase is to build a secure multi-school ERP foundation with proper role-based access and school-level data isolation.

---

## GitHub Repository Description

A multi-school ERP SaaS platform built with Next.js, Prisma, PostgreSQL, NextAuth, and Tailwind CSS for managing students, teachers, classes, sections, and role-based dashboards.

---

## Author

**Amninder Singh**

B.Tech AIML Student  
CGC University, Mohali

---

## License

This project is for learning, development, and portfolio purposes.
