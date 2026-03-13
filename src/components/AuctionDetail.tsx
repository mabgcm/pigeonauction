"use client";

import { useEffect, useMemo, useState } from "react";
import { listenToAuction, listenToBids, getNextMinimumBid, placeBid } from "@/lib/auction";
import { useAuth } from "@/components/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Auction, Bid } from "@/types/auction";
import BidderName from "@/components/BidderName";
import { getUserProfile } from "@/lib/users";
import Image from "next/image";
import PigeonGalleryModal from "@/components/PigeonGalleryModal";

export default function AuctionDetail({ auctionId }: { auctionId: string }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [now, setNow] = useState<Date>(new Date());
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    const unsubAuction = listenToAuction(auctionId, setAuction);
    const unsubBids = listenToBids(auctionId, setBids);
    return () => {
      unsubAuction();
      unsubBids();
    };
  }, [auctionId]);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setProfileName(profile?.name || user.displayName || user.email || "");
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const minBid = useMemo(() => (auction ? getNextMinimumBid(auction.current_price) : 0), [auction]);
  const auctionEnd = useMemo(() => (auction ? new Date(auction.auction_end) : null), [auction]);
  const isEnded = useMemo(() => {
    if (!auctionEnd) return false;
    return now.getTime() >= auctionEnd.getTime();
  }, [auctionEnd, now]);
  const timeRemainingMs = useMemo(() => {
    if (!auctionEnd) return 0;
    return Math.max(auctionEnd.getTime() - now.getTime(), 0);
  }, [auctionEnd, now]);
  const lessThan24h = useMemo(() => timeRemainingMs > 0 && timeRemainingMs <= 24 * 60 * 60 * 1000, [timeRemainingMs]);
  const countdown = useMemo(() => {
    if (!auctionEnd) return "";
    if (timeRemainingMs <= 0) return "00:00:00";
    const totalSeconds = Math.floor(timeRemainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [auctionEnd, timeRemainingMs]);

  async function handleBid() {
    if (!auction || !user) return;
    setError(null);
    setSubmitting(true);

    try {
      const value = Number(amount);
      if (!Number.isFinite(value)) {
        throw new Error("Enter a valid amount");
      }
      await placeBid({ auctionId, userId: user.uid, amount: value, userName: profileName });
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setSubmitting(false);
    }
  }

  if (!auction) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-neutral-600">
        Loading auction...
      </div>
    );
  }

  const galleryImages = ["/images/pigeon.jpg", "/images/pigeon.jpg", "/images/pigeon.jpg"];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/70 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="relative block h-64 w-full text-left"
          >
            <Image src="/images/pigeon.jpg" alt="Pigeon" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">
              View photos
            </span>
          </button>
          <div className="p-6">
            <h1 className="text-3xl font-semibold text-neutral-900">{auction.pigeon_name}</h1>
            <p className="mt-2 text-neutral-600">{auction.description}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-semibold text-neutral-900">Auction details</h2>
          {isEnded ? (
            <p className="mt-4 text-sm font-semibold text-emerald-600">Auction ended</p>
          ) : lessThan24h ? (
            <p className="mt-4 text-sm font-semibold text-red-600">Ends in {countdown}</p>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Ends {formatDate(auction.auction_end)}</p>
          )}
          <dl className="mt-6 grid gap-4 text-sm text-neutral-600 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">
                {isEnded ? "Sold at" : "Current Price"}
              </dt>
              <dd className="text-lg font-semibold text-neutral-900">
                {formatCurrency(auction.current_price)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">Auction Ends</dt>
              <dd className="text-base text-neutral-800">{formatDate(auction.auction_end)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">Bid Count</dt>
              <dd className="text-base text-neutral-800">{auction.bid_count}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">Status</dt>
              <dd className="text-base text-neutral-800 capitalize">{auction.status}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-semibold text-neutral-900">Recent bids</h2>
          <div className="mt-4 space-y-3">
            {bids.length === 0 ? (
              <p className="text-sm text-neutral-500">No bids yet.</p>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between text-sm text-neutral-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatCurrency(bid.bid_amount)}</span>
                    <BidderName userId={bid.user_id} fallback={bid.user_name} />
                  </div>
                  <span className="text-xs text-neutral-400">
                    {formatDate(
                      (bid as any).created_at?.toDate?.() ?? (bid as any).created_at_client ?? bid.created_at
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.1)] backdrop-blur">
        <h2 className="text-lg font-semibold text-neutral-900">
          {isEnded ? "Auction closed" : "Place a bid"}
        </h2>
        {isEnded ? (
          <p className="text-sm text-emerald-700">
            Bidding is closed. This auction finished at {formatCurrency(auction.current_price)}.
          </p>
        ) : (
          <p className="text-sm text-neutral-600">Minimum next bid: {formatCurrency(minBid)}</p>
        )}
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={`Enter ${formatCurrency(minBid)} or more`}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          disabled={isEnded}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleBid}
          disabled={!user || submitting || isEnded}
          className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isEnded
            ? "Auction ended"
            : user
              ? submitting
                ? "Placing bid..."
                : "Place bid"
              : "Sign in to bid"}
        </button>
      </div>
      <PigeonGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={galleryImages}
        activeIndex={galleryIndex}
        onChange={setGalleryIndex}
      />
    </div>
  );
}
