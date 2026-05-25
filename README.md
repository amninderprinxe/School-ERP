# School ERP SaaS Platform

A modern **multi-tenant School ERP SaaS platform** built with **Next.js, TypeScript, Prisma, PostgreSQL, NextAuth, and Tailwind CSS**. The platform is designed to manage multiple schools with secure role-based access for super admins, school admins, teachers, students, and parents.

## 🚀 Features

- Multi-tenant school management architecture
- Role-based access control
- Credentials-based authentication using NextAuth
- Prisma ORM with PostgreSQL database
- Clean and responsive dashboard UI
- Separate dashboards for different user roles
- Secure session handling
- Zod-based form validation
- Modern UI using Tailwind CSS and Lucide React icons

## 👥 User Roles

The platform supports the following roles:

- **SUPER_ADMIN** – Manages all schools and platform-level data
- **SCHOOL_ADMIN** – Manages data related to a specific school
- **TEACHER** – Accesses teacher-specific dashboard and academic data
- **STUDENT** – Accesses student dashboard and personal academic information
- **PARENT** – Accesses parent dashboard to view student-related information

## 🛠️ Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes / Server Actions
- **Authentication:** NextAuth
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Icons:** Lucide React

## 📁 Project Structure

```bash
school-erp/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── super-admin/
│   │   │   ├── school-admin/
│   │   │   ├── teacher/
│   │   │   ├── student/
│   │   │   └── parent/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   └── types/
├── .env.local
├── package.json
└── README.md
```

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/school-erp.git
cd school-erp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory and add:

```env
DATABASE_URL="your-postgresql-database-url"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 4. Set up Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

Optional seed command:

```bash
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
```

Open your browser and visit:

```bash
http://localhost:3000
```

## 🔐 Authentication

Authentication is handled using **NextAuth** with credentials-based login. User sessions include role information, which is used to protect routes and show role-specific dashboard pages.

## 🧑‍💼 Dashboard Pages

The system includes separate dashboard pages for:

- Super Admin
- School Admin
- Teacher
- Student
- Parent

Each role sees navigation and dashboard content based on their permissions.

## 🗄️ Database

The project uses **Prisma ORM** with a **PostgreSQL** database. Multi-tenant data separation is handled using school-based relations, allowing each school to manage its own data securely.

## 📌 Current Status

This project is currently in the initial development stage. Core authentication, role-based dashboards, and base multi-tenant structure are implemented.

## 🔮 Future Improvements

- Student management module
- Teacher management module
- Class and subject management
- Attendance module
- Exam and marks management
- Fee management
- Notice board
- Parent communication system
- Advanced reporting dashboard

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to fork this repository and submit a pull request.

## 📄 License

This project is open-source and available under the **MIT License**.

## 👨‍💻 Author

**Amninder Singh**

GitHub: [@amninderprinxe](https://github.com/amninderprinxe/)
