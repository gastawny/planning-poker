import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$")({
  component: NotFound,
});

function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-zinc-200">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
