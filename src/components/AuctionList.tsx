"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firestore";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Auction } from "@/types/auction";

export default function AuctionList() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const auctionsQuery = query(collection(db, "auctions"), where("status", "==", "live"));
    const unsubscribe = onSnapshot(auctionsQuery, (snap) => {
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Auction, "id">)
      }));
      setAuctions(list);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="grid gap-6">
      {auctions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 bg-white/70 p-6 text-neutral-600 shadow-sm">
          No live auctions yet. Seed a sample auction to get started.
        </p>
      ) : (
        auctions.map((auction) => {
          const auctionEnd = new Date(auction.auction_end);
          const timeRemainingMs = Math.max(auctionEnd.getTime() - now.getTime(), 0);
          const isEnded = timeRemainingMs === 0;
          const lessThan24h = timeRemainingMs > 0 && timeRemainingMs <= 24 * 60 * 60 * 1000;
          const totalSeconds = Math.floor(timeRemainingMs / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const pad = (value: number) => String(value).padStart(2, "0");
          const countdown = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

          return (
            <Link
              key={auction.id}
              href={`/auctions/${auction.id}`}
              className="group grid overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] md:grid-cols-[200px_1fr]"
            >
              <div className="relative h-40 w-full md:h-full">
                <Image
                  src="/images/pigeon.jpg"
                  alt="Pigeon"
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
              </div>
              <div className="flex items-start justify-between gap-6 p-6">
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-neutral-900">{auction.pigeon_name}</h3>
                  <p className="text-sm text-neutral-600 line-clamp-2">{auction.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                    {isEnded ? (
                      <span className="font-semibold text-emerald-600">Auction ended</span>
                    ) : lessThan24h ? (
                      <span className="font-semibold text-red-600">Ends in {countdown}</span>
                    ) : (
                      <span>Ends {formatDate(auction.auction_end)}</span>
                    )}
                    <span>{auction.bid_count} bids</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    {isEnded ? "Sold at" : "Current"}
                  </p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {formatCurrency(auction.current_price)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
