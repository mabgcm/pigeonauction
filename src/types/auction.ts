export type UserRole = "buyer" | "seller" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type AuctionStatus = "draft" | "pending" | "live" | "ended" | "cancelled";

export interface UserProfile {
  id: string;
  name: string;
  anonymous_name: string;
  email: string;
  role: UserRole;
  verification_status: VerificationStatus;
  banned?: boolean;
  onboarding_complete?: boolean;
  full_name?: string;
  phone?: string;
  city?: string;
  province?: string;
  country?: string;
  seller_loft_name?: string;
  seller_club?: string;
  rating?: number;
  created_at: string;
}

export interface Auction {
  id: string;
  seller_id: string;
  pigeon_name: string;
  description: string;
  pedigree_info?: string;
  pigeon_photos?: string[];
  starting_price: number;
  current_price: number;
  bid_count: number;
  auction_start: string;
  auction_end: string;
  status: AuctionStatus;
}

export interface AuctionQuestion {
  id: string;
  auction_id: string;
  user_id: string;
  question: string;
  answer?: string;
  created_at: string;
  answered_at?: string;
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
