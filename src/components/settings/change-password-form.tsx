"use client";

import { useState, useTransition, useRef } from "react";
import { changePassword }  from "@/action/password.actions";
import { SubmitButton }    from "@/components/ui/submit-button";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

// ── Shared style tokens ───────────────────────────────────────────
const INPUT_BASE =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder-gray-400 transition";

const LABEL = "block text-sm font-medium text-gray-700 mb-1.5";

// ── Password strength helper ──────────────────────────────────────
interface StrengthResult {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  textColor: string;
}

function getStrength(pw: string): StrengthResult {
  if (!pw)
    return { level: 0, label: "", color: "", textColor: "" };
  let score = 0;
  if (pw.length >= 8)            score++;
  if (pw.length >= 12)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;

  const map: StrengthResult[] = [
    { level: 0, label: "",            color: "",              textColor: "" },
    { level: 1, label: "Weak",        color: "bg-red-400",    textColor: "text-red-500" },
    { level: 2, label: "Fair",        color: "bg-amber-400",  textColor: "text-amber-500" },
    { level: 3, label: "Good",        color: "bg-yellow-400", textColor: "text-yellow-600" },
    { level: 4, label: "Strong",      color: "bg-green-500",  textColor: "text-green-600" },
    { level: 5, label: "Very Strong", color: "bg-green-600",  textColor: "text-green-700" },
  ];
  return map[Math.min(score, 5)] as StrengthResult;
}

// ── Reusable show/hide password input ────────────────────────────
interface PasswordInputProps {
  name:         string;
  placeholder:  string;
  autoComplete?: string;
  onChange?:    (val: string) => void;
}

function PasswordInput({
  name,
  placeholder,
  autoComplete = "off",
  onChange,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange?.(e.target.value)}
        className={INPUT_BASE}
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2
          text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show
          ? <EyeOff className="w-4 h-4" />
          : <Eye   className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────
export function ChangePasswordForm() {
  const formRef                      = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess]        = useState(false);
  const [formError, setFormError]    = useState<string | null>(null);
  const [fe, setFe]                  =
    useState<Record<string, string[] | undefined>>({});
  const [newPw, setNewPw]            = useState("");

  const strength = getStrength(newPw);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFe({});
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await changePassword(fd);
      if (res.success) {
        setSuccess(true);
        setNewPw("");
        formRef.current?.reset();
      } else {
        setFormError(res.error);
        if (!res.success && res.fieldErrors) setFe(res.fieldErrors);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>

      {/* ── Success banner ─────────────────────────────────── */}
      {success && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-green-50
          border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Password changed successfully!
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Your new password is active immediately. Use it on your next
              login.
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────── */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{formError}</p>
        </div>
      )}

      <div className="space-y-5">

        {/* Current password */}
        <div>
          <label className={LABEL}>
            Current Password <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="currentPassword"
            placeholder="Enter your current password"
            autoComplete="current-password"
          />
          {fe.currentPassword && (
            <p className="text-xs text-red-500 mt-1">
              {fe.currentPassword[0]}
            </p>
          )}
        </div>

        {/* New password + strength bar */}
        <div>
          <label className={LABEL}>
            New Password <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="newPassword"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            onChange={setNewPw}
          />
          {fe.newPassword && (
            <p className="text-xs text-red-500 mt-1">{fe.newPassword[0]}</p>
          )}

          {/* Strength indicator */}
          {newPw.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i <= strength.level
                        ? strength.color
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-semibold ${strength.textColor}`}>
                {strength.label}
                {strength.level <= 2 && (
                  <span className="font-normal text-gray-400">
                    {" "}— add uppercase, numbers, or symbols to strengthen
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className={LABEL}>
            Confirm New Password <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            name="confirmPassword"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />
          {fe.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">
              {fe.confirmPassword[0]}
            </p>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="mt-7 pt-5 border-t border-gray-100">
        <SubmitButton
          isPending={isPending}
          label="Change Password"
          pendingLabel="Updating…"
        />
      </div>

    </form>
  );
}