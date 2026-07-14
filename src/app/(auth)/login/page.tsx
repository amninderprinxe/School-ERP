"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    setError("");

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!result) {
        setError("Unable to connect. Please try again.");
        return;
      }

      if (result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.replace(result.url ?? "/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <Image
          src="/login-bg.jpg"
          alt="School campus"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center px-4 py-10 sm:px-8 lg:px-14">
        <div className="w-full max-w-md">
          <div className="relative overflow-visible rounded-[28px] bg-white shadow-2xl">
            <div className="absolute -right-5 -top-5 h-11 w-11 rounded-xl bg-blue-700 shadow-lg" />
            <div className="absolute -right-2 -top-8 h-7 w-7 rounded-lg bg-white" />
            <div className="absolute -bottom-4 -left-4 h-11 w-11 rounded-xl bg-blue-700 shadow-lg" />
            <div className="absolute -bottom-7 left-3 h-7 w-7 rounded-lg bg-white" />

            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Campus-X</h1>
                    <p className="text-xs font-medium text-slate-500">One Campus. One Smart System.</p>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-blue-800">Login</h2>
              </div>

              {error && (
                <div
                  id="login-error"
                  role="alert"
                  aria-live="polite"
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Email Address"
                  required
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Password"
                    required
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-blue-700 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex min-w-28 items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {loading ? "Signing in..." : "Login"}
                  </button>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-slate-700 transition hover:text-blue-700 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-4 text-center">
                <p className="text-xs text-slate-400">
                  Powered by <span className="font-semibold text-slate-600">Campus-X</span>
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/70">
            © {new Date().getFullYear()} Campus-X. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
