"use client";

import { useEffect, useMemo, useState } from "react";
import { listenToAuction, listenToBids, getNextMinimumBid, placeBid } from "@/lib/auction";
import { useAuth } from "@/components/AuthProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Auction, AuctionQuestion, Bid } from "@/types/auction";
import type { PedigreePreview } from "@/types/pedigree";
import BidderName from "@/components/BidderName";
import { getUserProfile } from "@/lib/users";
import PigeonGalleryModal from "@/components/PigeonGalleryModal";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { requireDb } from "@/lib/db";

export default function AuctionDetail({ auctionId }: { auctionId: string }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [questionStatus, setQuestionStatus] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);

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
      setLoadingProfile(true);
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setProfileName(profile?.anonymous_name || "Pigeon-XXXX");
      setIsVerified(profile?.verification_status === "approved");
      setIsBanned(Boolean(profile?.banned));
      setOnboardingComplete(Boolean(profile?.onboarding_complete));
      setLoadingProfile(false);
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (user) return;
    setProfileName("");
    setIsVerified(false);
    setIsBanned(false);
    setOnboardingComplete(false);
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    const db = requireDb();
    const questionsQuery = query(
      collection(db, "auctions", auctionId, "questions"),
      orderBy("created_at", "desc")
    );
    const unsubscribe = onSnapshot(questionsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AuctionQuestion, "id">)
      }));
      setQuestions(rows);
    });
    return () => unsubscribe();
  }, [auctionId]);

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
    if (
      !auction ||
      !user ||
      !isVerified ||
      isBanned ||
      !onboardingComplete ||
      auction.status !== "live"
    )
      return;
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

  const galleryImages =
    auction.pigeon_photos && auction.pigeon_photos.length > 0
      ? auction.pigeon_photos
      : ["/images/pigeon.jpg"];
  const isPending = auction.status === "pending";
  const isLive = auction.status === "live";
  const pedigreePreview = auction.pedigree_preview as PedigreePreview | undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/70 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="relative block h-64 w-full text-left"
          >
            <img
              src={galleryImages[0]}
              alt="Pigeon"
              className="h-full w-full object-cover"
              loading="eager"
            />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Pedigree</h2>
              <p className="text-sm text-neutral-500">
                AI-extracted lineage stored as reusable pigeon records.
              </p>
            </div>
            {auction.pedigree_pdf_url ? (
              <a
                href={auction.pedigree_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Open PDF
              </a>
            ) : null}
          </div>

          {auction.pedigree_status === "processing" ? (
            <p className="mt-4 text-sm text-amber-700">Pedigree extraction is still running.</p>
          ) : auction.pedigree_status === "failed" ? (
            <p className="mt-4 text-sm text-rose-700">
              {auction.pedigree_error ?? "Pedigree processing failed."}
            </p>
          ) : pedigreePreview ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Subject", bird: pedigreePreview.subject },
                  { label: "Father", bird: pedigreePreview.father },
                  { label: "Mother", bird: pedigreePreview.mother }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700"
                  >
                    <p className="text-xs uppercase tracking-wide text-neutral-400">{item.label}</p>
                    <p className="mt-2 font-semibold text-neutral-900">{item.bird?.name ?? "Unknown"}</p>
                    <p className="mt-1 text-neutral-500">{item.bird?.ring_number ?? "No ring number"}</p>
                    <p className="mt-1 text-neutral-500">{item.bird?.color ?? "Color unknown"}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-[0.65fr_1.35fr]">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Extraction</p>
                  <p className="mt-2 font-semibold text-neutral-900">
                    Confidence {Math.round(pedigreePreview.confidence * 100)}%
                  </p>
                  <p className="mt-1 text-neutral-500">
                    Language {pedigreePreview.source_language ?? "Unknown"}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Summary</p>
                  {auction.pedigree_info ? (
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-neutral-700">
                      {auction.pedigree_info}
                    </pre>
                  ) : (
                    <p className="mt-2 text-neutral-500">No summary available.</p>
                  )}
                  {pedigreePreview.notes.length > 0 ? (
                    <p className="mt-3 text-xs text-neutral-500">
                      Notes: {pedigreePreview.notes.join(" | ")}
                    </p>
                  ) : null}
                </div>
              </div>

              {auction.pedigree_pdf_url ? (
                <iframe
                  src={auction.pedigree_pdf_url}
                  title="Pedigree PDF"
                  className="h-[560px] w-full rounded-2xl border border-neutral-200 bg-white"
                />
              ) : null}
            </div>
          ) : auction.pedigree_source_url ? (
            <p className="mt-4 text-sm text-neutral-500">
              A pedigree source file is attached, but no AI extraction result is available yet.
            </p>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">No pedigree has been uploaded for this auction.</p>
          )}
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
        ) : isPending ? (
          <p className="text-sm text-amber-700">Awaiting admin approval before bidding opens.</p>
        ) : loadingProfile ? (
          <p className="text-sm text-neutral-600">Checking verification status...</p>
        ) : isBanned ? (
          <p className="text-sm text-rose-700">Your account is banned from bidding.</p>
        ) : !onboardingComplete ? (
          <p className="text-sm text-amber-700">Complete your profile to bid.</p>
        ) : user && !isVerified ? (
          <p className="text-sm text-amber-700">Verification required to place bids.</p>
        ) : (
          <p className="text-sm text-neutral-600">Minimum next bid: {formatCurrency(minBid)}</p>
        )}
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={`Enter ${formatCurrency(minBid)} or more`}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          disabled={isEnded || !isVerified || isBanned || !isLive || !onboardingComplete}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleBid}
          disabled={!user || submitting || isEnded || !isVerified || isBanned || !isLive || !onboardingComplete}
          className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isEnded
            ? "Auction ended"
            : user
              ? isPending
                ? "Awaiting approval"
                : isBanned
                  ? "Account banned"
                  : !onboardingComplete
                    ? "Complete profile"
                    : !isVerified
                      ? "Verification required"
                      : submitting
                        ? "Placing bid..."
                        : "Place bid"
              : "Sign in to bid"}
        </button>
      </div>
      <div className="space-y-4 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.1)] backdrop-blur">
        <h2 className="text-lg font-semibold text-neutral-900">Questions</h2>
        <p className="text-sm text-neutral-500">
          Ask about lineage, racing history, or health details. Admins will reply.
        </p>
        {user ? (
          <div className="space-y-2">
            <textarea
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Ask a question about this pigeon..."
              className="min-h-[90px] w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              disabled={isBanned}
            />
            <button
              onClick={async () => {
                if (!user || isBanned) return;
                if (questionText.trim().length < 5) {
                  setQuestionStatus("Question must be at least 5 characters.");
                  return;
                }
                const db = requireDb();
                await addDoc(collection(db, "auctions", auctionId, "questions"), {
                  auction_id: auctionId,
                  user_id: user.uid,
                  question: questionText.trim(),
                  created_at: new Date().toISOString(),
                  created_at_server: serverTimestamp()
                });
                setQuestionText("");
                setQuestionStatus("Question sent.");
              }}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
              disabled={isBanned}
            >
              Submit question
            </button>
            {questionStatus && <p className="text-xs text-neutral-500">{questionStatus}</p>}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Sign in to ask a question.</p>
        )}
        <div className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-neutral-500">No questions yet.</p>
          ) : (
            questions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
                <p className="font-medium text-neutral-900">{item.question}</p>
                {item.answer ? (
                  <p className="mt-2 text-sm text-emerald-700">Admin answer: {item.answer}</p>
                ) : (
                  <p className="mt-2 text-xs text-neutral-400">Awaiting admin response.</p>
                )}
              </div>
            ))
          )}
        </div>
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
