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
          Anonymous marketplace with verified buyers and sellers, real-time bids, and admin-approved listings.
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

      <section className="grid gap-4 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur">
        <h2 className="text-xl font-semibold text-neutral-800">How the platform works</h2>
        <p className="text-neutral-700">
          This platform runs verified pigeon auctions while keeping everyone anonymous. When you sign in,
          you receive a system-assigned anonymous username that can’t be edited or searched. You then pick
          a buyer or seller role and complete the required verification details so admins can approve you
          to bid or list pigeons.
        </p>
        <p className="text-neutral-700">
          Sellers create auctions with a starting price, photos, and an end date/time. Each listing is
          reviewed by admins before it goes live. Buyers can place real-time bids on live listings, ask
          questions about pigeons, and receive admin-posted answers inside each auction.
        </p>
        <p className="text-neutral-700">
          The admin dashboard manages approvals, bans, and auction actions, and keeps a log of all admin
          activity to ensure the marketplace stays safe and transparent.
        </p>
      </section>
    </main>
  );
}
