"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
type StudentActionResult = {
  success: boolean;
  data?: {
    id?: string;
  };
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

interface SectionOption {
  id: string;
  name: string;
  class: { name: string };
}

interface StudentInitialData {
  name: string;
  email: string;
  gender?: string | null;
  phone?: string | null;
  studentProfile?: {
    rollNumber?: string | null;
    admissionNo?: string | null;
    dateOfBirth?: Date | null;
    bloodGroup?: string | null;
    sectionId?: string | null;
  } | null;
}

interface StudentFormProps {
  sections:     SectionOption[];
  action:       (formData: FormData) => Promise<StudentActionResult>;
  initialData?: StudentInitialData;
  mode:         "create" | "edit";
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function toDateInput(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function StudentForm({ sections, action, initialData, mode }: StudentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[] | undefined>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.push("/school-admin/students");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  const p = initialData?.studentProfile;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className={LABEL}>Full Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" required defaultValue={initialData?.name}
            className={INPUT} placeholder="Aarav Mehta" />
          {fe.name && <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>}
        </div>

        {/* Email */}
        <div>
          <label className={LABEL}>Email Address <span className="text-red-500">*</span></label>
          <input type="email" name="email" required defaultValue={initialData?.email}
            className={INPUT} placeholder="student@school.edu" />
          {fe.email && <p className="text-xs text-red-500 mt-1">{fe.email[0]}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className={LABEL}>Gender</label>
          <select name="gender" defaultValue={initialData?.gender ?? ""} className={`${INPUT} bg-white`}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className={LABEL}>Phone</label>
          <input type="tel" name="phone" defaultValue={initialData?.phone ?? ""}
            className={INPUT} placeholder="+91 98765 43210" />
        </div>

        {/* Roll Number */}
        <div>
          <label className={LABEL}>Roll Number</label>
          <input type="text" name="rollNumber" defaultValue={p?.rollNumber ?? ""}
            className={INPUT} placeholder="10A-001" />
        </div>

        {/* Admission Number */}
        <div>
          <label className={LABEL}>Admission Number</label>
          <input type="text" name="admissionNo" defaultValue={p?.admissionNo ?? ""}
            className={INPUT} placeholder="ADM-2024-001" />
        </div>

        {/* Date of Birth */}
        <div>
          <label className={LABEL}>Date of Birth</label>
          <input type="date" name="dateOfBirth" defaultValue={toDateInput(p?.dateOfBirth)}
            className={INPUT} />
        </div>

        {/* Blood Group */}
        <div>
          <label className={LABEL}>Blood Group</label>
          <select name="bloodGroup" defaultValue={p?.bloodGroup ?? ""} className={`${INPUT} bg-white`}>
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>

        {/* Section */}
        <div className="md:col-span-2">
          <label className={LABEL}>Assign to Section</label>
          <select name="sectionId" defaultValue={p?.sectionId ?? ""} className={`${INPUT} bg-white`}>
            <option value="">— No section assigned —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class.name} — Section {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "create" && (
        <p className="text-xs text-gray-400 mt-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
          🔑 Default login password:{" "}
          <span className="font-mono font-semibold text-gray-600">Password@123</span>
          {" "}— student can change it after first login.
        </p>
      )}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Student" : "Update Student"}
          pendingLabel={mode === "create" ? "Adding…" : "Updating…"}
        />
        <Link href="/school-admin/students"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}