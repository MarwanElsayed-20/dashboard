import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-light tracking-tight">Not found</h1>
      <p className="text-muted">This message or page does not exist, or it was removed.</p>
      <Link href="/" className="w-fit underline underline-offset-4">
        Back to the inbox
      </Link>
    </main>
  );
}
