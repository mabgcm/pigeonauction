"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import type { Auction } from "@/types/auction";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/components/AuthProvider";

const heroBirds =
  "https://images.unsplash.com/photo-1523115191856-c203e76215a5?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000";
const heroLandscape =
  "https://upload.wikimedia.org/wikipedia/commons/a/af/Bird_Flying_Over_Mountains_%28Unsplash%29.jpg";
const pigeonCloseup =
  "https://images.unsplash.com/photo-1451075817461-2089f4dc1d61?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=2400";
const pigeonFlightLake =
  "https://images.unsplash.com/photo-1549586073-f4c3b7ff044a?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=2400";
const pigeonUrban =
  "https://images.unsplash.com/photo-1506564461966-4107c88f6d29?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=2400";
const pigeonLoft =
  "https://images.unsplash.com/photo-1768262437063-f1f1a466d579?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=2400";
const biddingMock =
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=2400";

export default function Home() {
  const { user, signInWithGoogle } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const db = requireDb();
    const auctionsQuery = query(collection(db, "auctions"), where("status", "==", "live"));
    const unsub = onSnapshot(auctionsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Auction, "id">)
      }));
      setAuctions(rows);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const endingSoon = useMemo(() => {
    return [...auctions]
      .sort((a, b) => new Date(a.auction_end).getTime() - new Date(b.auction_end).getTime())
      .slice(0, 6);
  }, [auctions]);

  return (
    <main
      className="flex min-h-screen flex-col gap-16 bg-[#f8fafc] pb-16 text-neutral-900"
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
      }}
    >
      <section
        className="relative w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(3,7,18,0.75), rgba(30,64,175,0.35)), url(${heroLandscape}), url(${heroBirds})`,
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center, center, center",
          backgroundBlendMode: "multiply, normal, normal"
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-20 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">PigeonBid.ca</p>
          <h1 className="text-4xl font-bold sm:text-5xl">
            Canada’s Trusted Racing Pigeon Auction Marketplace
          </h1>
          <p className="max-w-3xl text-base text-white/90 sm:text-lg">
            Verified buyers & sellers • Zero buyer fees • 100% Guarantee for Premium members • Low tiered
            seller commissions
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auctions"
              className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#1E40AF] hover:bg-white/90"
            >
              Browse Live Auctions
            </Link>
            <Link
              href="/auctions/new"
              className="rounded-full bg-[#10B981] px-6 py-3 text-base font-semibold text-white hover:bg-[#0ea375]"
            >
              Sell Your Birds Now – Free to List
            </Link>
            {!user && (
              <button
                onClick={() => signInWithGoogle()}
                className="rounded-full border border-white/70 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Join Free Today
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <span>✓ 100% Canadian Owned & Operated</span>
            <span>✓ Verified Users Only</span>
            <span>✓ Secure Payments in CAD</span>
            <span>✓ ARPU & Band-Registered Birds</span>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1E40AF]">Why PigeonBid.ca</p>
          <h2 className="text-3xl font-bold text-neutral-900">WHY PIGEONBID.CA</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1E40AF]">For Buyers</h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li>• No buyer fees – ever</li>
              <li>• 100% Money-Back or Replacement Guarantee when you’re a Premium member</li>
              <li>• Purchases at buyer’s risk for free members (clear & transparent)</li>
              <li>
                • All-inclusive service available with Premium: we handle housing, professional photography,
                and shipping
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1E40AF]">For Sellers</h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li>• Super-low tiered commissions:</li>
              <li>– 10% on first $800 in sales volume</li>
              <li>– 15% on sales up to $2,000</li>
              <li>– 20% only on volume over $2,000</li>
              <li>• Free to list</li>
              <li>• Verified buyers only</li>
              <li>• Fast payouts</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1E40AF]">For Everyone</h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li>• Strict verification process – real Canadian fanciers only</li>
              <li>• Domestic shipping made easy (we partner with trusted air cargo)</li>
              <li>• Live auctions + Buy-Now options</li>
              <li>• Full pedigree & performance history displayed</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1E40AF]">How it works</p>
            <h2 className="text-3xl font-bold text-neutral-900">How it works</h2>
            <div className="grid gap-4">
              {[
                "Join Free & Get Verified – Takes 2 minutes. Prove you’re a real Canadian pigeon fancier.",
                "Browse or List – Hundreds of young birds, proven racers, and top breeders go live every week.",
                "Bid or Buy – Zero fees for buyers. Transparent bidding. Real-time updates.",
                "Win & Relax – Premium members get our 100% guarantee + optional full-service shipping. Everyone gets secure payment protection."
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm text-neutral-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auctions"
                className="rounded-full bg-[#1E40AF] px-6 py-3 text-base font-semibold text-white hover:bg-[#1d4ed8]"
              >
                Start Buying
              </Link>
              <Link
                href="/auctions/new"
                className="rounded-full border border-[#1E40AF] px-6 py-3 text-base font-semibold text-[#1E40AF] hover:bg-[#1E40AF]/10"
              >
                Start Selling
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <img
              src={pigeonCloseup}
              alt="Healthy racing pigeon close-up"
              className="h-32 w-full rounded-2xl object-cover sm:h-40"
              loading="lazy"
            />
            <img
              src={pigeonLoft}
              alt="Pigeon loft in Canada"
              className="h-32 w-full rounded-2xl object-cover sm:h-40"
              loading="lazy"
            />
            <img
              src={biddingMock}
              alt="Auction bidding screen mockup"
              className="h-32 w-full rounded-2xl object-cover sm:h-40"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <div className="rounded-3xl border border-[#D97706] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D97706]">Premium</p>
          <h2 className="mt-2 text-2xl font-bold text-neutral-900">Unlock the Full PigeonBid Experience</h2>
          <p className="mt-2 text-sm text-neutral-700">Upgrade to Premium and enjoy:</p>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>• 100% Guarantee on every purchase (money back or healthy replacement)</li>
            <li>• All-Inclusive Service – we photograph, house, health-check, and ship your birds</li>
            <li>• Priority support & early access to premium auctions</li>
            <li>• Lower effective seller commissions on high volume</li>
          </ul>
          <p className="mt-4 text-sm font-semibold text-neutral-900">
            Only $19/month or $189/year – cancel anytime.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex rounded-full bg-[#D97706] px-6 py-3 text-base font-semibold text-white hover:bg-[#c46a05]"
          >
            Become Premium Today
          </Link>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900">Auctions Ending Soon</h2>
          <Link href="/auctions" className="text-sm font-semibold text-[#1E40AF] hover:underline">
            View All Live Auctions →
          </Link>
        </div>
        {endingSoon.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
            No live auctions yet. New listings are coming soon.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {endingSoon.map((auction) => {
              const timeLeftMs = Math.max(new Date(auction.auction_end).getTime() - now, 0);
              const totalSeconds = Math.floor(timeLeftMs / 1000);
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              const pad = (value: number) => String(value).padStart(2, "0");
              const countdown = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
              const image =
                auction.pigeon_photos && auction.pigeon_photos.length > 0
                  ? auction.pigeon_photos[0]
                  : pigeonCloseup;
              return (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <img src={image} alt={auction.pigeon_name} className="h-36 w-full rounded-t-2xl object-cover" />
                  <div className="space-y-2 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">{auction.pigeon_name}</h3>
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <span>Current bid</span>
                      <span className="font-semibold text-[#1E40AF]">
                        {formatCurrency(auction.current_price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Time left</span>
                      <span className="font-semibold text-[#10B981]">{countdown}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <h2 className="text-2xl font-bold text-neutral-900">Testimonials</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              quote:
                "“PigeonBid.ca made it easy to verify buyers and close sales fast. The live bidding felt fair and transparent.”",
              name: "Marc T."
            },
            {
              quote:
                "“I love the zero buyer fees and the premium guarantee. It’s the safest way I’ve ever bought racers.”",
              name: "Lisa K."
            },
            {
              quote:
                "“Great community, fast payouts, and the auctions are beautifully presented. Highly recommended.”",
              name: "Pierre L."
            }
          ].map((item) => (
            <div key={item.name} className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
              <p className="text-neutral-700">{item.quote}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">{item.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 rounded-3xl border border-neutral-200 bg-white px-6 py-10 shadow-sm">
        <h2 className="text-2xl font-bold text-neutral-900">
          Ready to join Canada’s fastest-growing racing pigeon community?
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auctions"
            className="rounded-full bg-[#1E40AF] px-6 py-3 text-base font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Browse Auctions Now
          </Link>
          <Link
            href="/auctions/new"
            className="rounded-full bg-[#10B981] px-6 py-3 text-base font-semibold text-white hover:bg-[#0ea375]"
          >
            List Your Birds Free
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-[#D97706] px-6 py-3 text-base font-semibold text-[#D97706] hover:bg-[#D97706]/10"
          >
            Upgrade to Premium
          </Link>
        </div>
      </section>

    </main>
  );
}
