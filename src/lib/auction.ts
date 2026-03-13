import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { requireDb } from "@/lib/db";
import type { Auction, Bid } from "@/types/auction";

export const auctionRef = (id: string) => doc(requireDb(), "auctions", id);

export function listenToAuction(id: string, onChange: (auction: Auction | null) => void): Unsubscribe {
  return onSnapshot(auctionRef(id), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange({ id: snap.id, ...(snap.data() as Omit<Auction, "id">) });
  });
}

export function listenToBids(auctionId: string, onChange: (bids: Bid[]) => void): Unsubscribe {
  const db = requireDb();
  const bidsQuery = query(collection(db, "bids"), where("auction_id", "==", auctionId));
  return onSnapshot(bidsQuery, (snap) => {
    const list = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Bid, "id">)
    }));
    const sorted = list.sort((a, b) => {
      const aDate =
        (a as any).created_at?.toDate?.() ??
        ((a as any).created_at_client ? new Date((a as any).created_at_client) : new Date(0));
      const bDate =
        (b as any).created_at?.toDate?.() ??
        ((b as any).created_at_client ? new Date((b as any).created_at_client) : new Date(0));
      return bDate.getTime() - aDate.getTime();
    });
    onChange(sorted);
  });
}

export function getNextMinimumBid(currentPrice: number) {
  if (currentPrice < 300) return currentPrice + 20;
  if (currentPrice < 1000) return currentPrice + 50;
  return currentPrice + 100;
}

export async function placeBid(params: {
  auctionId: string;
  userId: string;
  amount: number;
  userName?: string;
}) {
  const { auctionId, userId, amount, userName } = params;

  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const ref = auctionRef(auctionId);
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Auction not found");
    }
    const auction = snap.data() as Auction;
    if (auction.status !== "live") {
      throw new Error("Auction is not live");
    }
    const minBid = getNextMinimumBid(auction.current_price);
    if (amount < minBid) {
      throw new Error(`Minimum bid is ${minBid}`);
    }

    tx.update(ref, {
      current_price: amount,
      bid_count: (auction.bid_count || 0) + 1
    });

    const bidsCol = collection(db, "bids");
    const bidDoc = {
      auction_id: auctionId,
      user_id: userId,
      bid_amount: amount,
      user_name: userName ?? "",
      created_at: serverTimestamp(),
      created_at_client: new Date().toISOString()
    };
    tx.set(doc(bidsCol), bidDoc);
  });
}

export async function fetchAuction(id: string) {
  const snap = await getDoc(auctionRef(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Auction, "id">) } as Auction;
}
