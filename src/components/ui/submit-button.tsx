"use client";

interface SubmitButtonProps {
  isPending: boolean;
  label?: string;
  pendingLabel?: string;
  className?: string;
}

export function SubmitButton({
  isPending,
  label = "Save",
  pendingLabel = "Saving…",
  className = "",
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
        disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-semibold
        rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:ring-offset-2 ${className}`}
    >
      {isPending && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {isPending ? pendingLabel : label}
    </button>
  );
}