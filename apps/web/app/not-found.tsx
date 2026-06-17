import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-slate-600">
        That page doesn’t exist or has moved. Try one of your local test centres
        instead.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/test-centres" className="btn-secondary">
          Browse test centres
        </Link>
      </div>
    </section>
  );
}
