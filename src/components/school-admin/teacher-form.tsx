"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/types/actions";

interface TeacherInitialData {
  name: string;
  email: string;
  gender?: string | null;
  phone?: string | null;
  teacherProfile?: {
    employeeCode?: string | null;
    qualification?: string | null;
    joiningDate?: Date | null;
  } | null;
}

interface TeacherFormProps {
  action:       (formData: FormData) => Promise<ActionResult>;
  initialData?: TeacherInitialData;
  mode:         "create" | "edit";
}

function toDateInput(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

export function TeacherForm({ action, initialData, mode }: TeacherFormProps) {
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
        router.push("/school-admin/teachers");
        router.refresh();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  const tp = initialData?.teacherProfile;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={LABEL}>Full Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" required defaultValue={initialData?.name}
            className={INPUT} placeholder="Ravi Sharma" />
          {fe.name && <p className="text-xs text-red-500 mt-1">{fe.name[0]}</p>}
        </div>

        <div>
          <label className={LABEL}>Email Address <span className="text-red-500">*</span></label>
          <input type="email" name="email" required defaultValue={initialData?.email}
            className={INPUT} placeholder="teacher@school.edu" />
          {fe.email && <p className="text-xs text-red-500 mt-1">{fe.email[0]}</p>}
        </div>

        <div>
          <label className={LABEL}>Gender</label>
          <select name="gender" defaultValue={initialData?.gender ?? ""} className={`${INPUT} bg-white`}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Phone</label>
          <input type="tel" name="phone" defaultValue={initialData?.phone ?? ""}
            className={INPUT} placeholder="+91 98765 43210" />
        </div>

        <div>
          <label className={LABEL}>Employee Code</label>
          <input type="text" name="employeeCode" defaultValue={tp?.employeeCode ?? ""}
            className={INPUT} placeholder="TCH-001" />
        </div>

        <div>
          <label className={LABEL}>Qualification</label>
          <input type="text" name="qualification" defaultValue={tp?.qualification ?? ""}
            className={INPUT} placeholder="M.Sc Mathematics" />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL}>Joining Date</label>
          <input type="date" name="joiningDate" defaultValue={toDateInput(tp?.joiningDate)}
            className={`${INPUT} max-w-xs`} />
        </div>
      </div>

      {mode === "create" && (
        <p className="text-xs text-gray-400 mt-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
          🔑 Default login password:{" "}
          <span className="font-mono font-semibold text-gray-600">Password@123</span>
        </p>
      )}

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label={mode === "create" ? "Add Teacher" : "Update Teacher"}
          pendingLabel={mode === "create" ? "Adding…" : "Updating…"}
        />
        <Link href="/school-admin/teachers"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}