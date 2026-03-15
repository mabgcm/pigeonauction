"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile, updateUserProfileDetails } from "@/lib/users";
import type { UserProfile } from "@/types/auction";
import { collection, getDocs, query, where } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ProfileForm() {
  const { user } = useAuth();
  const [anonymousName, setAnonymousName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("Canada");
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<UserProfile["verification_status"]>("pending");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState<{
    totalBids: number;
    totalBidAmount: number;
    highestBid: number;
    lastBidAt?: Date;
  }>({ totalBids: 0, totalBidAmount: 0, highestBid: 0 });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setAnonymousName(profile?.anonymous_name || "Pigeon-XXXX");
      setFullName(profile?.full_name || profile?.name || user.displayName || "");
      setPhone(profile?.phone || "");
      setCity(profile?.city || "");
      setProvince(profile?.province || "");
      setCountry(profile?.country || "Canada");
      setEmail(user.email ?? "");
      setVerificationStatus(profile?.verification_status || "pending");
      setOnboardingComplete(Boolean(profile?.onboarding_complete));
      setEditMode(profile?.verification_status !== "approved");
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      if (!user) return;
      const db = requireDb();
      const bidsQuery = query(collection(db, "bids"), where("user_id", "==", user.uid));
      const snap = await getDocs(bidsQuery);
      if (!active) return;
      const bids = snap.docs.map((docSnap) => docSnap.data() as { bid_amount: number; created_at?: any; created_at_client?: string });
      const totalBids = bids.length;
      const totalBidAmount = bids.reduce((sum, bid) => sum + (bid.bid_amount || 0), 0);
      const highestBid = bids.reduce((max, bid) => Math.max(max, bid.bid_amount || 0), 0);
      const lastBidAt = bids
        .map((bid) => {
          if (bid.created_at?.toDate) return bid.created_at.toDate() as Date;
          if (bid.created_at_client) return new Date(bid.created_at_client);
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
      setStats({ totalBids, totalBidAmount, highestBid, lastBidAt });
    }
    loadStats();
    return () => {
      active = false;
    };
  }, [user]);

  const isVerified = useMemo(() => verificationStatus === "approved", [verificationStatus]);

  async function handleSave() {
    if (!user) return;
    setStatus(null);
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setStatus("Full name must be at least 2 characters.");
      return;
    }
    if (!phone.trim() || !city.trim() || !province.trim()) {
      setStatus("Phone, city, and province are required.");
      return;
    }
    setLoading(true);
    await updateUserProfileDetails(user.uid, {
      full_name: trimmedName,
      phone: phone.trim(),
      city: city.trim(),
      province: province.trim(),
      country: country.trim(),
      onboarding_complete: true
    });
    setLoading(false);
    setOnboardingComplete(true);
    setStatus("Profile saved. You can now request verification.");
    setEditMode(false);
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">
        Sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Profile</p>
            <h2 className="text-2xl font-semibold text-neutral-900">Account details</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isVerified ? "Verified" : "Pending verification"}
            </span>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-300"
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500">Email</label>
            <p className="mt-1 break-words text-sm text-neutral-700">{email}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-500">Anonymous username</label>
            <p className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              {anonymousName}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This username is automatically assigned and cannot be edited.
            </p>
          </div>

          {editMode ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                City
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-neutral-500">
                Province
                <input
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-neutral-500 md:col-span-2">
                Country
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </label>
            </div>
          ) : (
            <dl className="grid gap-4 text-sm text-neutral-700 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Full name</dt>
                <dd className="mt-1 font-medium text-neutral-900">{fullName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Phone</dt>
                <dd className="mt-1 font-medium text-neutral-900">{phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">City</dt>
                <dd className="mt-1 font-medium text-neutral-900">{city || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Province</dt>
                <dd className="mt-1 font-medium text-neutral-900">{province || "—"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Country</dt>
                <dd className="mt-1 font-medium text-neutral-900">{country || "—"}</dd>
              </div>
            </dl>
          )}

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            These details are required for verification to buy or sell. Admins review submissions before
            approving accounts.
          </div>
          {status && <p className="text-sm text-neutral-600">{status}</p>}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          )}
          {!onboardingComplete && (
            <p className="text-xs text-amber-700">
              Complete your profile to request verification and start bidding or listing pigeons.
            </p>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-neutral-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Activity</p>
        <h3 className="mt-2 text-xl font-semibold text-neutral-900">Bidding summary</h3>
        <div className="mt-4 grid gap-3 text-sm text-neutral-700">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
            <span>Total bids</span>
            <span className="font-semibold text-neutral-900">{stats.totalBids}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
            <span>Total bid amount</span>
            <span className="font-semibold text-neutral-900">{formatCurrency(stats.totalBidAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
            <span>Highest bid</span>
            <span className="font-semibold text-neutral-900">{formatCurrency(stats.highestBid)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
            <span>Last bid</span>
            <span className="font-semibold text-neutral-900">
              {stats.lastBidAt ? formatDate(stats.lastBidAt.toISOString()) : "No bids yet"}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
