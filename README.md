# Campus-X — Multi-Tenant School ERP SaaS

Campus-X is a modern, role-based School ERP SaaS platform built to simplify daily operations for school administrators, teachers, students, and parents.

It supports multi-school data isolation, student and teacher management, attendance, exams, results, timetables, fees, announcements, CSV imports, and role-specific dashboards.

---

## Features

### Multi-Tenant School Management
- Multiple schools supported in one platform
- School-level data isolation
- Unique school codes
- Active, inactive, and suspended school states
- Super Admin school management

### Authentication and Role-Based Access
- Credentials-based authentication with NextAuth
- JWT sessions
- Role-based dashboards
- Supported roles:
  - Super Admin
  - School Admin
  - Teacher
  - Student
  - Parent
- Email login for admins, teachers, and parents
- Student login using a generated Student ID
- Forgot password and password reset flow
- Active/inactive account control

### Student Management
- Add, edit, view, and delete students
- Assign students to classes and sections
- Parent account creation and linking
- Unique roll number per section
- Automatic Student ID generation

Student ID format:

```text
<SCHOOL_CODE>-<CLASS><SECTION>-<ROLL_NUMBER>
```

Example:

```text
4S-10A-015
```

- Student IDs regenerate when class, section, or roll number changes
- Existing Student ID remains active until new promotion data is assigned
- Promotion flow supported from Class 1 to Class 12
- Class 12 students can be marked as passed out

### Teacher Management
- Add, edit, view, and delete teachers
- Employee code and qualification support
- Subject assignment
- Class teacher assignment
- Teacher-specific timetable and dashboard data

### Classes, Sections, and Subjects
- Class CRUD
- Section CRUD
- Subject CRUD
- School-specific class and section validation
- Duplicate prevention
- Class teacher assignment
- Teacher-subject mapping

### Attendance
- Teacher attendance marking
- Attendance statuses:
  - Present
  - Absent
  - Late
  - Half Day
- School Admin attendance overview
- Date and section filters
- CSV export
- Student and parent attendance views

### Exams and Results
- Exam creation and management
- Supported exam types:
  - Unit Test
  - Mid Term
  - Final
  - Assignment
  - Practical
  - Other
- Teacher marks entry
- Grade and remarks support
- Student and parent result views
- Duplicate result prevention

### Timetable
- School Admin timetable grid
- Day-wise and period-wise scheduling
- Subject and teacher assignment
- Teacher conflict prevention
- Student timetable view
- Parent timetable view
- Teacher timetable view

### Fee Management
- Fee category management
- Fee structure creation
- Class-specific or school-wide fee structures
- Academic year support
- Student fee assignment
- Payment recording
- Partial, paid, pending, and waived statuses
- Payment modes:
  - Cash
  - Bank Transfer
  - Cheque
  - Online
- Student and parent fee ledger
- Collection and defaulter reporting

### Announcements
- School-specific announcements
- Role-based announcement display
- Latest announcements on dashboards

### Bulk CSV Import
- Student CSV import
- Teacher CSV import
- Maximum 500 records per import
- Validation preview
- Duplicate email detection
- Duplicate section roll number detection
- Automatic Student ID generation during import
- Import result summary with imported, skipped, and failed rows

---

## Tech Stack

### Frontend
- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React
- Shadcn UI

### Backend
- Next.js Server Actions
- Next.js App Router
- NextAuth
- Zod
- bcryptjs

### Database
- MySQL
- Prisma ORM

### Development Tools
- Node.js
- npm
- Git
- GitHub
- Prisma Studio

---

## Project Structure

```text
src/
├── action/                  # Server Actions
├── app/
│   ├── (auth)/              # Login and password reset pages
│   ├── (dashboard)/         # Role-based dashboards
│   └── api/                 # API routes
├── components/              # Reusable UI components
├── lib/
│   ├── db.ts                # Prisma client
│   ├── session.ts           # Role and session helpers
│   ├── student-id-utils.ts  # Student ID generation
│   └── validations/         # Zod schemas
├── types/                   # TypeScript declarations
└── auth.ts                  # NextAuth configuration

prisma/
├── schema.prisma
└── seed.ts
```

---

## Prerequisites

Install the following before running the project:

- Node.js 20 or later
- npm
- MySQL
- Git

---

## Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd School-ERP
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
copy .env.example .env
```

For macOS or Linux:

```bash
cp .env.example .env
```

Configure the environment variables:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3307/school_erp"

AUTH_SECRET="your-secure-auth-secret"
AUTH_URL="http://localhost:3000"

SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
MAIL_FROM="Campus-X <no-reply@example.com>"
```

Never commit `.env` or `.env.local` files to GitHub.

---

## Database Setup

Format and validate the Prisma schema:

```bash
npx prisma format
npx prisma validate
```

Push the schema to MySQL:

```bash
npx prisma db push
```

Generate Prisma Client:

```bash
npx prisma generate
```

Open Prisma Studio:

```bash
npx prisma studio
```

Optional seed command:

```bash
npx prisma db seed
```

---

## Run the Application

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Type-check the project:

```bash
npx tsc --noEmit
```

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

---

## Student Login ID Generation

Student IDs are generated automatically using:

```text
School Code + Class + Section + Roll Number
```

Example data:

```text
School Code: 4S
Class: 10
Section: A
Roll Number: 15
```

Generated Student ID:

```text
4S-10A-015
```

The default student password is currently:

```text
Password@123
```

Change the default password before using the project in production.

---

## CSV Student Import Format

```csv
name,email,gender,phone,rollNumber,admissionNo,dateOfBirth,bloodGroup,className,sectionName
Aarav Singh,aarav@example.com,MALE,+919000000001,15,ADM-001,2010-01-10,B+,Grade 10,A
```

Important rules:

- `className` and `sectionName` must already exist in the school
- `rollNumber` should only contain the actual roll number
- Do not enter values such as `10A-015` in the roll number column
- Email addresses must be unique
- Roll numbers must be unique within each section
- The school must have a unique school code

---

## Security and Data Isolation

- Every school-owned record is filtered by `schoolId`
- School Admins can only manage users and data from their own school
- Passwords are hashed using bcrypt
- Sessions use JWT
- Server Actions verify user roles
- Student IDs are globally unique
- Sensitive environment variables are excluded from version control

---

## Git Ignore

Ensure the following files and folders are ignored:

```gitignore
node_modules/
.next/
.env
.env.local
*.log
```

---

## Current Development Status

### Completed
- Multi-tenant school management
- Authentication and role-based dashboards
- Student management
- Teacher management
- Class and section management
- Subject management
- Announcements
- Attendance
- Exams and results
- Timetable management
- Fee schema and fee management UI
- Student and teacher CSV import
- Automatic Student ID generation
- Student login through Student ID

### Planned
- Razorpay integration
- PDF report cards
- Attendance PDF export
- Fee receipts
- Email notifications
- In-app notifications
- Audit logs
- Multi-academic-year support
- Profile photo upload
- Production deployment
- Mobile application

---

## Production Checklist

Before production deployment:

- Replace the default password
- Use a secure `AUTH_SECRET`
- Configure a production MySQL database
- Configure SMTP credentials
- Add rate limiting
- Enable HTTPS
- Add database backups
- Validate all school codes
- Test role-based access
- Test multi-school isolation
- Run TypeScript and production build checks

```bash
npx tsc --noEmit
npm run build
```

---

## Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a pull request

---

## License

This project is currently intended for educational and development purposes.

---

## Author

**Amninder Singh**

B.Tech Artificial Intelligence and Machine Learning  
Full-Stack Developer

---

## Project Name

**Campus-X**

> One Campus. One Smart System.
