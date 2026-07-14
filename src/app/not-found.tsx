import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-black text-gray-200 select-none">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          Page Not Found
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5
            bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
            rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}