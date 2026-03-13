"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { db } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";

export default function SeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  async function createSampleAuction() {
    if (!user) {
      setStatus("Sign in first.");
      return;
    }
    setStatus("Creating...");
    const now = new Date();
    const end = new Date(now.getTime() + 1000 * 60 * 60 * 6);
    const payload = {
      seller_id: user.uid,
      pigeon_name: "Blue Bar Homer",
      description: "Healthy, calm racing pigeon with documented pedigree and strong homing instinct.",
      pedigree_info: "Lineage: Skyline-2021 × QuickWing-2019",
      starting_price: 200,
      current_price: 200,
      bid_count: 0,
      auction_start: now.toISOString(),
      auction_end: end.toISOString(),
      status: "live",
      created_at: serverTimestamp()
    };

    const ref = await addDoc(collection(db, "auctions"), payload);
    setStatus(`Created auction ${ref.id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold text-neutral-900">Seed data</h1>
      <p className="text-neutral-600">Create a sample pigeon auction for testing bids.</p>
      <button
        onClick={createSampleAuction}
        className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Create sample auction
      </button>
      {status && <p className="text-sm text-neutral-600">{status}</p>}
    </main>
  );
}
