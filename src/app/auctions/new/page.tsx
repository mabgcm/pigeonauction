import AuctionCreateForm from "@/components/AuctionCreateForm";

export default function NewAuctionPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Sell</p>
        <h1 className="text-4xl font-semibold text-neutral-900">List a pigeon for auction</h1>
        <p className="text-neutral-600">
          Verified sellers can create live auctions with photos, details, and a starting price.
        </p>
      </header>
      <AuctionCreateForm />
    </main>
  );
}
