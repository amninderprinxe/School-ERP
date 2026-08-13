'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 border border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-2">Dashboard Error Aaya Hai</h2>
        <p className="text-gray-600 text-sm mb-4">
          {error.message || "Server te data fetch karde waqt koi unhandled error aaya hai."}
        </p>
        <button
          onClick={() => reset()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Dubara Koshish Karo
        </button>
      </div>
    </div>
  );
}