import type { Role } from "@prisma/client";

export interface NavItem {
  label:       string;
  href:        string;
  icon:        string;
  exactMatch?: boolean;
}

export const NAV_CONFIG: Record<Role, NavItem[]> = {

  SUPER_ADMIN: [
    { label: "Dashboard", href: "/super-admin",         icon: "LayoutDashboard", exactMatch: true },
    { label: "Schools",   href: "/super-admin/schools", icon: "Building2" },
    { label: "All Users", href: "/super-admin/users",   icon: "Users" },
    { label: "Settings",  href: "/settings",            icon: "Settings" },
  ],

  SCHOOL_ADMIN: [
    { label: "Dashboard",     href: "/school-admin",               icon: "LayoutDashboard", exactMatch: true },
    { label: "Students",      href: "/school-admin/students",      icon: "GraduationCap" },
    { label: "Teachers",      href: "/school-admin/teachers",      icon: "UserCheck" },
    { label: "Classes",       href: "/school-admin/classes",       icon: "BookOpen" },
    { label: "Sections",      href: "/school-admin/sections",      icon: "Layers" },
    { label: "Subjects",      href: "/school-admin/subjects",      icon: "BookMarked" },
    { label: "Timetable",     href: "/school-admin/timetable",     icon: "CalendarDays" },  // ← NEW
    { label: "Exams",         href: "/school-admin/exams",         icon: "ClipboardList" },
    { label: "Results",       href: "/school-admin/results",       icon: "ClipboardCheck" },
    { label: "Attendance",    href: "/school-admin/attendance",    icon: "CalendarCheck" },
    { label: "Announcements", href: "/school-admin/announcements", icon: "Megaphone" },
  ],

  TEACHER: [
    { label: "Dashboard",   href: "/teacher",            icon: "LayoutDashboard", exactMatch: true },
    { label: "Attendance",  href: "/teacher/attendance", icon: "CalendarCheck" },
    { label: "Results",     href: "/teacher/results",    icon: "ClipboardCheck" },
    { label: "My Classes",  href: "/teacher/classes",    icon: "BookOpen" },
    { label: "My Subjects", href: "/teacher/subjects",   icon: "BookMarked" },
    { label: "Students",    href: "/teacher/students",   icon: "Users" },
  ],

  STUDENT: [
    { label: "Dashboard",   href: "/student",            icon: "LayoutDashboard", exactMatch: true },
    { label: "My Subjects", href: "/student/subjects",   icon: "BookMarked" },
    { label: "Attendance",  href: "/student/attendance", icon: "CalendarCheck" },
    { label: "Results",     href: "/student/results",    icon: "Award" },
  ],

  PARENT: [
    { label: "Dashboard",   href: "/parent",             icon: "LayoutDashboard", exactMatch: true },
    { label: "My Children", href: "/parent/children",    icon: "Baby" },
    { label: "Attendance",  href: "/parent/attendance",  icon: "CalendarCheck" },
    { label: "Results",     href: "/parent/results",     icon: "Award" },
  ],
};
