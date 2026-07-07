"use client";

import { useTransition }       from "react";
import { KeyRound }            from "lucide-react";
import { resetUserPassword }   from "@/action/password.actions";

interface ResetPasswordButtonProps {
  targetUserId: string;
  userName:     string;
  className?:   string;
}

const DEFAULT_PW = "Password@123";

export function ResetPasswordButton({
  targetUserId,
  userName,
  className = "",
}: ResetPasswordButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleReset = () => {
    if (
      !confirm(
        `Reset password for "${userName}"?\n\n` +
        `Their password will be set to:\n${DEFAULT_PW}\n\n` +
        `Please inform them to change it after their next login.`,
      )
    )
      return;

    startTransition(async () => {
      const res = await resetUserPassword(targetUserId);
      if (res.success) {
        alert(
          `✅ Password reset successfully!\n\n` +
          `New temporary password: ${DEFAULT_PW}\n\n` +
          `Notify ${userName} to change it on next login.`,
        );
      } else {
        alert(`❌ Reset failed: ${res.error}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
        font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
        disabled:opacity-50 disabled:cursor-not-allowed rounded-lg
        transition-colors ${className}`}
    >
      <KeyRound className="w-3.5 h-3.5" />
      {isPending ? "Resetting…" : "Reset Password"}
    </button>
  );
}
