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
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-700 shadow-sm md:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex h-4 w-5 flex-col justify-between">
              <span
                className={`h-0.5 w-full rounded-full bg-neutral-800 transition ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded-full bg-neutral-800 transition ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full rounded-full bg-neutral-800 transition ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>
      <div
        className={`md:hidden ${menuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden border-t border-white/60 bg-white/95 transition-all duration-300`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4">
          <Link href="/auctions" className="text-sm font-semibold text-neutral-800">
            Auctions
          </Link>
          <Link href="/auctions/new" className="text-sm font-semibold text-neutral-800">
            Sell
          </Link>
          <Link href="/profile" className="text-sm font-semibold text-neutral-800">
            Profile
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-sm font-semibold text-neutral-800">
              Admin
            </Link>
          )}
          <div className="mt-2 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
            {loading ? (
              <span className="text-neutral-500">Loading...</span>
            ) : user ? (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">{user.displayName ?? user.email}</span>
                <button
                  onClick={signOutUser}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-700 hover:border-neutral-400"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full rounded-full bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
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
