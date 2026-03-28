import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl uppercase tracking-[0.18em] text-white">404</p>
      <p className="mt-4 text-lg text-muted">That player route does not look like a valid SteamID64.</p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.24em] text-accent transition hover:border-accent hover:text-white"
      >
        Back Home
      </Link>
    </main>
  );
}
