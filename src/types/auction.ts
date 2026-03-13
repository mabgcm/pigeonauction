export type UserRole = "buyer" | "seller" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type AuctionStatus = "draft" | "live" | "ended" | "cancelled";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  verification_status: VerificationStatus;
  rating?: number;
  created_at: string;
}

export interface Auction {
  id: string;
  seller_id: string;
  pigeon_name: string;
  description: string;
  pedigree_info?: string;
  starting_price: number;
  current_price: number;
  bid_count: number;
  auction_start: string;
  auction_end: string;
  status: AuctionStatus;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  bid_amount: number;
  created_at: string;
  user_name?: string;
}

export interface Order {
  id: string;
  auction_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  commission: number;
  shipping_status: "pending" | "shipped" | "delivered" | "confirmed";
  payment_status: "pending" | "paid" | "released" | "refunded";
}
