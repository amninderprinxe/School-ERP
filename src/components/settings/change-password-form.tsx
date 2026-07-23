"use client";

import {
  useRef,
  useState,
  useTransition,
} from "react";
import { changePassword } from "@/action/password.actions";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import type { Role } from "@prisma/client";

// ── Shared style tokens ───────────────────────────────────────────

const INPUT_BASE =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 " +
  "focus:border-transparent placeholder-gray-400 transition";

const LABEL =
  "block text-sm font-medium text-gray-700 mb-1.5";

// ── Password strength helper ──────────────────────────────────────

interface StrengthResult {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  textColor: string;
}

function getStrength(password: string): StrengthResult {
  if (!password) {
    return {
      level: 0,
      label: "",
      color: "",
      textColor: "",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengthMap: StrengthResult[] = [
    {
      level: 0,
      label: "",
      color: "",
      textColor: "",
    },
    {
      level: 1,
      label: "Weak",
      color: "bg-red-400",
      textColor: "text-red-500",
    },
    {
      level: 2,
      label: "Fair",
      color: "bg-amber-400",
      textColor: "text-amber-500",
    },
    {
      level: 3,
      label: "Good",
      color: "bg-yellow-400",
      textColor: "text-yellow-600",
    },
    {
      level: 4,
      label: "Strong",
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      level: 5,
      label: "Very Strong",
      color: "bg-green-600",
      textColor: "text-green-700",
    },
  ];

  return strengthMap[Math.min(score, 5)] as StrengthResult;
}

// ── Reusable password field ───────────────────────────────────────

interface PasswordInputProps {
  name: string;
  placeholder: string;
  autoComplete?: string;
  onChange?: (value: string) => void;
}

function PasswordInput({
  name,
  placeholder,
  autoComplete = "off",
  onChange,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className={INPUT_BASE}
      />

      <button
        type="button"
        onClick={() =>
          setShowPassword((previous) => !previous)
        }
        tabIndex={-1}
        aria-label={
          showPassword
            ? "Hide password"
            : "Show password"
        }
        className="
          absolute right-3 top-1/2 -translate-y-1/2
          text-gray-400 transition-colors
          hover:text-gray-600
        "
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────

interface ChangePasswordFormProps {
  role: Role;
}

export function ChangePasswordForm({
  role,
}: ChangePasswordFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [isPending, startTransition] =
    useTransition();

  const [success, setSuccess] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<
      Record<string, string[] | undefined>
    >({});

  const [newPassword, setNewPassword] =
    useState("");

  const strength =
    getStrength(newPassword);

  const passwordResetContact =
    role === "SCHOOL_ADMIN"
      ? "Super Admin"
      : "School Administrator";

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    const formData =
      new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        await changePassword(formData);

      if (result.success) {
        setSuccess(true);
        setNewPassword("");
        formRef.current?.reset();
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
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
    >
      {/* ── Password guidance ─────────────────────────────── */}
      <div
        className="
          mb-6 flex items-start gap-3 rounded-lg
          border border-blue-200 bg-blue-50 p-4
        "
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <div>
          <p className="text-sm font-semibold text-blue-800">
            Password change information
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            You can change your password if you know your
            current password. New accounts may use the
            temporary password{" "}
            <span className="font-semibold">
              Password@123
            </span>{" "}
            before setting a personal password.
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            If you have forgotten your password, please
            contact the{" "}
            <span className="font-semibold">
              {passwordResetContact}
            </span>{" "}
            to reset it.
          </p>
        </div>
      </div>

      {/* ── Success banner ────────────────────────────────── */}
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
              Password changed successfully!
            </p>

            <p className="mt-0.5 text-xs text-green-600">
              Your new password is active immediately.
              Use it on your next login.
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────── */}
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

      <div className="space-y-5">
        {/* Current password */}
        <div>
          <label className={LABEL}>
            Current Password{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <PasswordInput
            name="currentPassword"
            placeholder="Enter your current password"
            autoComplete="current-password"
          />

          {fieldErrors.currentPassword && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.currentPassword[0]}
            </p>
          )}
        </div>

        {/* New password */}
        <div>
          <label className={LABEL}>
            New Password{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <PasswordInput
            name="newPassword"
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            onChange={setNewPassword}
          />

          {fieldErrors.newPassword && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.newPassword[0]}
            </p>
          )}

          {newPassword.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex gap-1">
                {(
                  [1, 2, 3, 4, 5] as const
                ).map((level) => (
                  <div
                    key={level}
                    className={`
                      h-1 flex-1 rounded-full
                      transition-colors duration-300
                      ${
                        level <= strength.level
                          ? strength.color
                          : "bg-gray-200"
                      }
                    `}
                  />
                ))}
              </div>

              <p
                className={`
                  text-xs font-semibold
                  ${strength.textColor}
                `}
              >
                {strength.label}

                {strength.level <= 2 && (
                  <span className="font-normal text-gray-400">
                    {" "}
                    — add uppercase letters, numbers or
                    symbols to strengthen it
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className={LABEL}>
            Confirm New Password{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <PasswordInput
            name="confirmPassword"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />

          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.confirmPassword[0]}
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="mt-7 border-t border-gray-100 pt-5">
        <SubmitButton
          isPending={isPending}
          label="Change Password"
          pendingLabel="Updating…"
        />
      </div>
    </form>
  );
}
