"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <h2 className="text-xl font-bold text-red-600">Something went wrong!</h2>
      <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Try Again
      </button>
    </div>
  );
}