"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(
    token ? "" : "The password reset link is invalid.",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("The password reset link is invalid.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Unable to reset your password.");
        return;
      }

      setMessage(
        data?.message ?? "Your password has been reset successfully.",
      );
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H3v-4l6.257-6.257A6 6 0 1121 9z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white">
              Create New Password
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              Choose a secure password for your account
            </p>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {error && (
              <div
                id="reset-password-error"
                role="alert"
                aria-live="polite"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                id="reset-password-success"
                role="status"
                aria-live="polite"
                className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-700"
              >
                {message}
              </div>
            )}

            {!message && (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <PasswordInput
                  id="password"
                  label="New Password"
                  value={password}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  onChange={(value) => {
                    setPassword(value);
                    if (error) setError("");
                  }}
                  disabled={loading || !token}
                  autoComplete="new-password"
                />

                <PasswordInput
                  id="confirmPassword"
                  label="Confirm New Password"
                  value={confirmPassword}
                  showPassword={showConfirmPassword}
                  setShowPassword={setShowConfirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    if (error) setError("");
                  }}
                  disabled={loading || !token}
                  autoComplete="new-password"
                />

                <p className="text-xs text-gray-500">
                  Use at least 8 characters with at least one letter and one
                  number.
                </p>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {loading ? "Resetting password..." : "Reset Password"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  onChange: (value: string) => void;
  disabled: boolean;
  autoComplete: string;
};

function PasswordInput({
  id,
  label,
  value,
  showPassword,
  setShowPassword,
  onChange,
  disabled,
  autoComplete,
}: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          disabled={disabled}
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          {showPassword ? (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3l18 18M10.585 10.587a2 2 0 002.828 2.828M9.88 4.24A9.94 9.94 0 0112 4c5.523 0 10 4.477 10 8a9.96 9.96 0 01-2.064 4.828M6.61 6.61C3.83 8.096 2 10.54 2 12c0 3.523 4.477 8 10 8a9.96 9.96 0 004.39-1.02"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Loading...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
