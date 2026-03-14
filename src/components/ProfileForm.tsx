"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile, updateUserProfileDetails } from "@/lib/users";
import type { UserProfile } from "@/types/auction";

export default function ProfileForm() {
  const { user } = useAuth();
  const [anonymousName, setAnonymousName] = useState("");
  const [role, setRole] = useState<UserProfile["role"]>("buyer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("Canada");
  const [sellerLoftName, setSellerLoftName] = useState("");
  const [sellerClub, setSellerClub] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<UserProfile["verification_status"]>("pending");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!isMounted) return;
      setAnonymousName(profile?.anonymous_name || "Pigeon-XXXX");
      setRole(profile?.role || "buyer");
      setFullName(profile?.full_name || profile?.name || user.displayName || "");
      setPhone(profile?.phone || "");
      setCity(profile?.city || "");
      setProvince(profile?.province || "");
      setCountry(profile?.country || "Canada");
      setSellerLoftName(profile?.seller_loft_name || "");
      setSellerClub(profile?.seller_club || "");
      setEmail(user.email ?? "");
      setVerificationStatus(profile?.verification_status || "pending");
      setOnboardingComplete(Boolean(profile?.onboarding_complete));
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const isSeller = useMemo(() => role === "seller", [role]);

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
      role,
      full_name: trimmedName,
      phone: phone.trim(),
      city: city.trim(),
      province: province.trim(),
      country: country.trim(),
      seller_loft_name: sellerLoftName.trim(),
      seller_club: sellerClub.trim(),
      onboarding_complete: true
    });
    setLoading(false);
    setOnboardingComplete(true);
    setStatus("Profile saved. You can now request verification.");
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">
        Sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Email</label>
          <p className="mt-1 text-sm text-neutral-700">{email}</p>
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
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500">Role</label>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={role === "buyer"}
                onChange={() => setRole("buyer")}
              />
              Buyer
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="seller"
                checked={role === "seller"}
                onChange={() => setRole("seller")}
              />
              Seller
            </label>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Role selection is required for verification to buy or sell.
          </p>
        </div>
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
        {isSeller && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs uppercase tracking-wide text-neutral-500">
              Loft name (optional)
              <input
                value={sellerLoftName}
                onChange={(event) => setSellerLoftName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-neutral-500">
              Breeder club (optional)
              <input
                value={sellerClub}
                onChange={(event) => setSellerClub(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
          </div>
        )}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          These details are required for verification to buy or sell. Admins review submissions before
          approving accounts.
        </div>
        <div className="text-xs text-neutral-500">
          Verification status: <span className="font-semibold">{verificationStatus}</span>
        </div>
        {status && <p className="text-sm text-neutral-600">{status}</p>}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {loading ? "Saving..." : "Save profile"}
        </button>
        {!onboardingComplete && (
          <p className="text-xs text-amber-700">
            Complete your profile to request verification and start bidding or listing pigeons.
          </p>
        )}
      </div>
    </div>
  );
}
