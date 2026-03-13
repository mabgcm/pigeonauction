import AuctionList from "@/components/AuctionList";

export default function AuctionsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Auctions</p>
        <h1 className="mt-3 text-4xl font-semibold text-neutral-900">Live pigeon listings</h1>
        <p className="mt-2 text-neutral-600">
          Curated Canadian auctions with live bidding and verified breeders.
        </p>
      </header>
      <AuctionList />
    </main>
  );
}
