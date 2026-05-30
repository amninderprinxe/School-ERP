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
