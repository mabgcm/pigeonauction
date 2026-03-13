import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
          Pigeon Auction Platform
        </p>
        <h1 className="text-4xl font-semibold text-neutral-900">
          Real-time, verified pigeon auctions in Canada
        </h1>
        <p className="text-lg text-neutral-600">
          Anonymous marketplace with secure bidding, escrow payments, and verified sellers.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auctions"
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            View auctions
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-400"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-xl font-semibold text-neutral-800">Next steps</h2>
        <ul className="list-disc pl-5 text-neutral-700">
          <li>Create a sample auction from the Seed page.</li>
          <li>Open the auction and place bids in real time.</li>
          <li>Integrate identity verification before enabling live payments.</li>
        </ul>
      </section>
    </main>
  );
}
