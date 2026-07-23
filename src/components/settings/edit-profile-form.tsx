"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/action/profile.actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  CheckCircle2,
  User,
  Phone,
} from "lucide-react";
import type { ActionResult } from "@/types/actions";

interface Props {
  initialName: string;
  initialPhone: string | null;
  initialAvatarUrl: string;
  userInitials: string;
}

const INPUT =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "focus:border-transparent placeholder-gray-400 transition";

const LABEL =
  "block text-sm font-medium text-gray-700 mb-1.5";

export function EditProfileForm({
  initialName,
  initialPhone,
  initialAvatarUrl,
  userInitials,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [name, setName] =
    useState(initialName);

  const [phone, setPhone] =
    useState(initialPhone ?? "");

  const [success, setSuccess] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<
      Record<string, string[] | undefined>
    >({});

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSuccess(false);
    setFormError(null);
    setFieldErrors({});

    const formData =
      new FormData(event.currentTarget);

    startTransition(async () => {
      const result: ActionResult =
        await updateProfile(formData);

      if (result.success) {
        setSuccess(true);
        router.refresh();
        return;
      }

      setFormError(result.error);

      if (result.fieldErrors) {
        setFieldErrors(
          result.fieldErrors,
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
    >
      {/* ── Success banner ─────────────────────────────── */}
      {success && (
        <div
          className="
            mb-6 flex items-start gap-3 rounded-lg
            border border-green-200 bg-green-50 p-4
          "
        >
          <CheckCircle2
            className="
              mt-0.5 h-5 w-5 shrink-0
              text-green-600
            "
          />

          <div>
            <p className="text-sm font-semibold text-green-800">
              Profile updated!
            </p>

            <p className="mt-0.5 text-xs text-green-600">
              Your changes are now live across the app.
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────── */}
      {formError && (
        <div
          className="
            mb-6 rounded-lg border
            border-red-200 bg-red-50 p-4
          "
        >
          <p className="text-sm font-medium text-red-600">
            {formError}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Name ─────────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Full Name{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <div className="relative">
            <User
              className="
                pointer-events-none absolute
                left-3 top-1/2 h-4 w-4
                -translate-y-1/2 text-gray-400
              "
            />

            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Your full name"
              className={`${INPUT} pl-9`}
            />
          </div>

          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.name[0]}
            </p>
          )}
        </div>

        {/* ── Phone ────────────────────────────────────── */}
        <div>
          <label className={LABEL}>
            Phone Number{" "}
            <span
              className="
                text-xs font-normal
                text-gray-400
              "
            >
              (optional)
            </span>
          </label>

          <div className="relative">
            <Phone
              className="
                pointer-events-none absolute
                left-3 top-1/2 h-4 w-4
                -translate-y-1/2 text-gray-400
              "
            />

            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="+91 98765 43210"
              className={`${INPUT} pl-9`}
            />
          </div>

          {fieldErrors.phone && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.phone[0]}
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="mt-7 border-t border-gray-100 pt-5">
        <SubmitButton
          isPending={isPending}
          label="Save Changes"
          pendingLabel="Saving…"
        />
      </div>
    </form>
  );
}
