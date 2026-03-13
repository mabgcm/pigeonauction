import AuctionDetail from "@/components/AuctionDetail";

export default function AuctionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <AuctionDetail auctionId={params.id} />
    </main>
  );
}
