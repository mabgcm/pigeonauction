"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/users";

export default function SiteHeader() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (!active) return;
      setIsAdmin(profile?.role === "admin");
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            PigeonAuction
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-neutral-600 md:flex">
            <Link href="/auctions" className="hover:text-neutral-900">
              Auctions
            </Link>
            <Link href="/auctions/new" className="hover:text-neutral-900">
              Sell
            </Link>
            <Link href="/profile" className="hover:text-neutral-900">
              Profile
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-neutral-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-3 md:flex">
            {loading ? (
              <span className="text-neutral-500">Loading...</span>
            ) : user ? (
              <>
                <span className="text-neutral-600">{user.displayName ?? user.email}</span>
                <button
                  onClick={signOutUser}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-700 hover:border-neutral-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded-full bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
              >
                Sign in
              </button>
            )}
          </div>
          <div className="md:hidden">
            {loading ? (
              <span className="text-xs text-neutral-500">Loading...</span>
            ) : user ? (
              <button
                onClick={signOutUser}
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-400"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
